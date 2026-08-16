import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Inbox } from 'lucide-react'
import type {
  PaginationMetadata,
  ProblemaOperativoListItemDto,
} from '@/services/contracts/flota'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Paginacion } from '@/shared/ui/Paginacion'
import { ColaDeProblemas } from './ColaDeProblemas'
import { PanelContextoProblema } from './PanelContextoProblema'
import { PanelDetalleProblema } from './PanelDetalleProblema'
import type { AccionDeMutacionProblema } from '../BarraDeAccionesProblema'
import { ModalResolverProblema } from '../ModalResolverProblema'
import { ModalSilenciarProblema } from '../ModalSilenciarProblema'
import { useProblemaDetalle } from '../../../hooks/useProblemaDetalle'
import {
  OPCIONES_TAMANO_PAGINA_PROBLEMAS,
  claveDelVacioDeLaBandeja,
} from '../../../vocabulario-sala-problemas'

/**
 * Vista **Sala** del Centro de Problemas (`?vista=sala`, la default).
 *
 * Los 3 paneles de la ficha §2: cola priorizada · detalle (preview) · contexto. La cola y el
 * contexto salen de la **misma** respuesta paginada que la página ya tiene; el detalle hace su
 * propio `GET /problemas/{id}` porque `descripcion`, `senales`, `contextoOperativo`,
 * `prioridadDetalle` y `accionesDisponibles` **no están en el listado**.
 *
 * ── LA SELECCIÓN ES ESTADO LOCAL, NO URL ──────────────────────────────────────────────────────
 * La ficha §8 dice que el 1.er click sobre un chip **selecciona y no navega**. Mientras `f-09` no
 * existía, `f-06` había puesto la selección en `?ticket=` para que ese deep-link no quedara muerto;
 * con el ticket construido, `?ticket=` volvió a significar "abrí el caso entero" y la selección
 * bajó acá. Consecuencia declarada: no se puede compartir un link con un chip preseleccionado — y
 * para eso está `?ticket=`, que muestra más.
 *
 * ── LOS 5 ESTADOS ─────────────────────────────────────────────────────────────────────────────
 *  - **loading**: skeleton en la cola y en los 2 paneles.
 *  - **empty**: hay **uno solo** y no dos. "Sin resultados" no existe acá porque **no hay filtros
 *    que limpiar** (B-17), y ofrecer un botón "Limpiar" sin filtros dejaría al usuario apretando
 *    algo que no hace nada. El copy lo da `claveDelVacioDeLaBandeja`, que **tampoco** ramifica: el
 *    vacío no puede afirmar por qué está vacío sin haber preguntado.
 *  - **forbidden**: lo resuelve la página con overlay (nunca redirect, B-3).
 *  - **error**: recuperable con reintento, y **solo cuando no llegó ninguna respuesta** — con una
 *    respuesta en mano (aunque traiga 0 items) es partial-data: la cola se queda con su vacío y el
 *    fallo se avisa arriba, una sola vez, desde la página.
 *  - **partial-data**: el bloque de estado en vivo del vehículo avisa y el resto del detalle se
 *    muestra igual (D-C1 a).
 */
export function VistaSala({
  problemas,
  hayRespuesta,
  cargando,
  error,
  onReintentar,
  paginacion,
  onPagina,
}: {
  problemas: readonly ProblemaOperativoListItemDto[]
  /**
   * ¿Llegó alguna respuesta del servidor? **No es `problemas.length > 0`**, y la diferencia es la
   * que corrigió el cierre de slice-06: con `keepPreviousData`, después del primer 200 la bandeja
   * vacía —que hoy es el único estado alcanzable— hacía que un refetch fallado pintara el error
   * **dos veces** (el aviso de la página + esta superficie) y **borrara el vacío** que explica por
   * qué la bandeja está así. Datos en mano = respuesta recibida, aunque venga con 0 items.
   */
  hayRespuesta: boolean
  cargando: boolean
  error: unknown
  onReintentar: () => void
  paginacion: PaginationMetadata | null
  onPagina: (cambio: { pagina: number; tamanoPagina: number }) => void
}) {
  const { t } = useTranslation('flota')
  const { t: tComun } = useTranslation()

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)

  /** Un modal por vez. El problema sobre el que opera es siempre el seleccionado. */
  const [modal, setModal] = useState<'ninguno' | 'silenciar' | 'resolver'>('ninguno')

  const detalle = useProblemaDetalle(seleccionadoId ?? undefined)

  const apiError = error ? parseApiError(error) : null

  const claveDelVacio = claveDelVacioDeLaBandeja()

  const vacio = (
    <EstadoVacio
      variante="sin-datos"
      icono={Inbox}
      titulo={t(`${claveDelVacio}.titulo`)}
      descripcion={t(`${claveDelVacio}.descripcion`)}
    />
  )

  const errorDeLaCola =
    apiError !== null && !hayRespuesta ? (
      <EstadoError
        variante="recuperable"
        titulo={t('centro.problemas.error.titulo')}
        mensaje={resolveApiErrorMessage(apiError, tComun)}
        trazaId={apiError.traceId ?? undefined}
        textoReintentar={t('centro.problemas.error.reintentar')}
        onReintentar={onReintentar}
      />
    ) : undefined

  const paginador =
    paginacion !== null && paginacion.totalItems > 0 ? (
      <Paginacion
        variante="compacta"
        pagina={paginacion.page}
        tamanoPagina={paginacion.pageSize}
        total={paginacion.totalItems}
        opcionesTamano={OPCIONES_TAMANO_PAGINA_PROBLEMAS}
        onCambio={onPagina}
        textos={{
          anterior: t('centro.problemas.paginacion.anterior'),
          siguiente: t('centro.problemas.paginacion.siguiente'),
          porPagina: t('centro.problemas.paginacion.porPagina'),
          rango: (desde, hasta, total) =>
            t('centro.problemas.paginacion.rango', { desde, hasta, total }),
        }}
      />
    ) : undefined

  const tituloDelSeleccionado = detalle.data?.titulo ?? ''

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
      <ColaDeProblemas
        problemas={problemas}
        cargando={cargando && !hayRespuesta}
        seleccionadoId={seleccionadoId}
        onSeleccionar={setSeleccionadoId}
        vacio={vacio}
        error={errorDeLaCola}
        pie={paginador}
      />

      <PanelDetalleProblema
        problemaId={seleccionadoId}
        detalle={detalle.data}
        cargando={detalle.isPending}
        error={detalle.error}
        onReintentar={() => void detalle.refetch()}
        onAccion={(accion: AccionDeMutacionProblema) => {
          if (accion === 'silenciar' || accion === 'resolver') setModal(accion)
        }}
      />

      {/*
        Sin selección el panel de contexto NO se monta, y no es un atajo: `useProblemaDetalle` queda
        deshabilitado por `enabled`, y en React Query v5 una query deshabilitada reporta
        `isPending: true` **para siempre** — el panel se quedaría con su esqueleto girando sobre una
        superficie que no está cargando nada. Además el panel de detalle ya invita a elegir un
        problema; dos paneles vacíos al lado no agregan información.
      */}
      {seleccionadoId === null ? null : (
        <PanelContextoProblema
          detalle={detalle.data}
          cargando={detalle.isPending}
          problemasDeLaPagina={problemas}
        />
      )}

      <ModalSilenciarProblema
        problemaId={seleccionadoId}
        titulo={tituloDelSeleccionado}
        abierto={modal === 'silenciar'}
        onCerrar={() => setModal('ninguno')}
      />

      <ModalResolverProblema
        problemaId={seleccionadoId}
        titulo={tituloDelSeleccionado}
        abierto={modal === 'resolver'}
        onCerrar={() => setModal('ninguno')}
      />
    </div>
  )
}
