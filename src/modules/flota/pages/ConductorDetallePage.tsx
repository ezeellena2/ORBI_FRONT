import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Route, UserRound } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/base/tabs'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type {
  AsignacionConductorHistorialDto,
  ConductorDetalleDto,
} from '@/services/contracts/flota'
import { Aviso } from '@/shared/ui/Aviso'
import { useConductor } from '../hooks/useConductor'
import { ModalAsignarVehiculo } from '../components/conductores/ModalAsignarVehiculo'
import { ModalCambiarEstadoConductor } from '../components/conductores/ModalCambiarEstadoConductor'
import { ModalEditarConductor } from '../components/conductores/ModalEditarConductor'
import { ModalVincularDispositivo } from '../components/conductores/ModalVincularDispositivo'
import {
  ModalDesasignarVehiculo,
  ModalDesvincularDispositivo,
} from '../components/conductores/ModalesCierreConductor'
import {
  DialogoBajaConductor,
  DialogoEliminarConductor,
  DialogoReactivarConductor,
} from '../components/conductores/DialogosConductor'
import { ConductorCargando } from '../components/conductores/detalle/ConductorCargando'
import { HeroConductor } from '../components/conductores/detalle/HeroConductor'
import { MiniStatsConductor } from '../components/conductores/detalle/MiniStatsConductor'
import {
  PAGE_SIZE_HISTORIAL_CONDUCTOR,
  TabAsignacionesConductor,
} from '../components/conductores/detalle/TabAsignacionesConductor'
import { TabDocumentosConductor } from '../components/conductores/detalle/TabDocumentosConductor'
import { TabInfoConductor } from '../components/conductores/detalle/TabInfoConductor'

/**
 * `/app/flota/conductores/:conductorId` — la ficha del conductor operativo (`f-06`).
 *
 * Es una COMPOSICION DE CAPAS: identidad canonica proyectada (read-only, P-A) + operativo de Flota
 * (estado, legajo, notas, asignaciones, documentos) + lo que compondria Telemetria, que **no tiene
 * fuente**.
 *
 * LOS 5 ESTADOS OBLIGATORIOS viven acá arriba, antes de cualquier render de contenido:
 *  - loading      → esqueleto de hero + stats + panel (`ConductorCargando`).
 *  - forbidden    → `SinAccesoOverlay` que BLOQUEA la pagina. Nunca un redirect (B-3): un redirect
 *                   silencioso le hace creer al usuario que la pantalla no existe.
 *  - error 404    → "Conductor no encontrado". Un id de OTRA organizacion responde **404, no 403**, y
 *                   la UI tampoco intenta distinguirlos: es la regla de cross-tenant uniforme.
 *  - error otro   → recuperable con "Reintentar", sin perder la URL.
 *  - empty        → no aplica a nivel pagina (un detalle siempre tiene conductor); vive POR TAB: sin
 *                   vehiculo, sin dispositivos, sin documentos, sin historial.
 *  - partial-data → NO tiene rama propia, y es a proposito: la identidad canonica llega en `null`
 *                   dentro de un 200 exitoso (**gate de PII** del `find-or-create`) y las stats no
 *                   tienen fuente. Cada bloque muestra su fallback y **todo lo propio de Flota se
 *                   sigue viendo**. Convertirlo en pantalla de error seria romper la ficha por una
 *                   dependencia externa.
 *
 * ── SON 4 TABS, NO 5 ──────────────────────────────────────────────────────────────────────────
 * **Infracciones esta DIFERIDO a fase 2 (B-19) y el tab NO se renderiza**, tampoco como
 * "proximamente". El permiso `flota.conductores.gestionar-infracciones` existe en el catalogo y no
 * gatea nada.
 *
 * "Actividad" SI se dibuja, pero **no emite ningun request**: `GET .../recorridos` responde SIEMPRE
 * 500 `flota.telemetria.no_disponible` (convencion 8b), asi que se declara sin fuente. Tampoco se
 * dibujan las 4 tarjetas de "eventos de manejo" (sin contrato), el boton "Exportar" del tab ni el
 * link "Ver actividad completa" (**DA-CD2-24 viva**: no tiene destino).
 */

/** Un modal por vez. */
type ModalAbierto =
  | 'ninguno'
  | 'editar'
  | 'estado'
  | 'asignar-vehiculo'
  | 'vincular-dispositivo'
  | 'desasignar-vehiculo'
  | 'desvincular-dispositivo'
  | 'baja'
  | 'reactivar'
  | 'eliminar'

export default function ConductorDetallePage() {
  const { conductorId } = useParams<{ conductorId: string }>()
  const { t } = useTranslation(['flota', 'common'])
  const navigate = useNavigate()
  const consulta = useConductor(conductorId)

  // Sin id la consulta queda deshabilitada y `isPending` no baja nunca: mostrar el esqueleto para
  // siempre seria un spinner infinito. La ruta siempre trae el param, pero el caso se cierra igual.
  if (conductorId === undefined) {
    return <ConductorNoEncontrado />
  }

  if (consulta.isPending) {
    return <ConductorCargando />
  }

  /*
    ── UN REFETCH QUE FALLA NO BORRA LA FICHA QUE YA ESTABA EN PANTALLA ──────────────────────────
    En React Query v5 `status` pasa a `'error'` **aunque `data` siga en mano** (variante
    `RefetchError`). Con el `if (consulta.isError)` puesto antes del render, cualquier refetch de
    fondo fallado reemplazaba la ficha ENTERA por el panel de error — y sobre esta pantalla invalidan
    9 mutations distintas, así que el caso típico era: la baja responde 204, el refetch se cae, y el
    usuario lee "no pudimos cargar el conductor" sobre una operación que SÍ se hizo.

    Un error CON datos en mano es partial-data, no una pantalla de error: la ficha se queda y el
    fallo se avisa arriba, con su reintento. Es el mismo guard que `ConductoresListPage` ya tenía.
  */
  const conductor = consulta.data

  if (conductor === undefined) {
    const apiError = parseApiError(consulta.error)

    if (apiError.status === 403) {
      return (
        // `SinAccesoOverlay` es `absolute inset-0`: necesita un contenedor posicionado con alto
        // propio, o se colapsa a cero y el bloqueo no se ve.
        <div className="relative min-h-96 flex-1">
          {/*
            `permiso` es SIEMPRE el permiso literal, nunca `apiError.code`: el 403 del gate de modulo
            trae `code: flota.modulo.no_activo`, que no existe en el catalogo de 44 permisos.
          */}
          <SinAccesoOverlay
            permiso="flota.conductores.leer"
            titulo={t('flota:forbidden.titulo')}
            descripcion={t('flota:conductorDetalle.sinAcceso.descripcion')}
            textoVolver={t('flota:forbidden.volver')}
            onVolver={() => navigate('/app')}
          />
        </div>
      )
    }

    if (apiError.status === 404) {
      return <ConductorNoEncontrado />
    }

    return (
      <EstadoError
        titulo={t('flota:conductorDetalle.error.titulo')}
        mensaje={t('flota:conductorDetalle.error.descripcion')}
        trazaId={apiError.traceId ?? undefined}
        textoReintentar={t('flota:comun.reintentar')}
        onReintentar={() => void consulta.refetch()}
      />
    )
  }

  return (
    <FichaConductor
      conductor={conductor}
      errorDeRefresco={consulta.isError ? consulta.error : null}
      onReintentar={() => void consulta.refetch()}
    />
  )
}

function FichaConductor({
  conductor,
  errorDeRefresco,
  onReintentar,
}: {
  conductor: ConductorDetalleDto
  errorDeRefresco: unknown
  onReintentar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const [modal, setModal] = useState<ModalAbierto>('ninguno')

  const apiErrorRefresco = errorDeRefresco ? parseApiError(errorDeRefresco) : null

  /**
   * Asignacion / vinculo sobre el que operan los 2 modales de cierre. Se guardan enteros —no solo su
   * id— porque el `DELETE` de vehiculo necesita ademas el `vehiculoFlotaId` para armar la URL.
   */
  const [aDesasignar, setADesasignar] = useState<AsignacionConductorHistorialDto | null>(null)
  const [aDesvincular, setADesvincular] = useState<string | null>(null)

  /**
   * Posicion dentro del historial de asignaciones. Vive ACA y no dentro del tab porque el panel
   * inactivo se desmonta: un `useState` adentro se perderia en cada ida y vuelta a "Info general" y
   * el usuario volveria a la pagina 1 sin ningun aviso.
   */
  const [historial, setHistorial] = useState({
    page: 1,
    pageSize: PAGE_SIZE_HISTORIAL_CONDUCTOR,
  })

  /*
    ── `?tab=` FIJA EL TAB INICIAL, Y SOLO ESO ───────────────────────────────────────────────────
    `f-05` §4 manda que "Renovar licencia" del listado navegue al **destino real**: esta ficha, tab de
    documentos. Sin esto, el usuario aterrizaria en "Info general" y tendria que buscar el tab.

    Es `defaultValue`, o sea **solo el valor inicial**: cambiar de tab NO reescribe la URL. Sincronizar
    los dos sentidos es **DA-DD-11, abierta** para el modulo, y no se cablea hasta que el PO decida —
    la ficha se comparte por su URL, y esa URL apunta al conductor, no a la pestaña que alguien tenia
    abierta.
  */
  const tabInicial = parametros.get('tab') === 'documentos' ? 'documentos' : 'info'

  const vinculo =
    conductor.dispositivosAsignados.find((item) => item.asignacionId === aDesvincular) ?? null

  return (
    <div className="flex flex-col gap-6">
      <EnlaceVolver />

      {apiErrorRefresco ? (
        <Aviso
          titulo={t('flota:conductorDetalle.error.tituloRefresco')}
          mensaje={resolveApiErrorMessage(apiErrorRefresco, t)}
          trazaId={apiErrorRefresco.traceId ?? undefined}
          accion={
            <Boton variante="secundaria" tamano="sm" onClick={onReintentar}>
              {t('flota:comun.reintentar')}
            </Boton>
          }
        />
      ) : null}

      <HeroConductor
        conductor={conductor}
        onEditar={() => setModal('editar')}
        onCambiarEstado={() => setModal('estado')}
        onAsignarVehiculo={() => setModal('asignar-vehiculo')}
        onVincularDispositivo={() => setModal('vincular-dispositivo')}
        onDesactivar={() => setModal('baja')}
        onReactivar={() => setModal('reactivar')}
        onEliminar={() => setModal('eliminar')}
      />

      <MiniStatsConductor />

      <Tabs defaultValue={tabInicial}>
        <TabsList variant="line" className="flex-wrap">
          <TabsTrigger value="info">{t('flota:conductorDetalle.tabs.info')}</TabsTrigger>
          <TabsTrigger value="asignaciones">
            {t('flota:conductorDetalle.tabs.asignaciones')}
          </TabsTrigger>
          <TabsTrigger value="documentos">
            {t('flota:conductorDetalle.tabs.documentos')}
          </TabsTrigger>
          <TabsTrigger value="actividad">{t('flota:conductorDetalle.tabs.actividad')}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="pt-4">
          <TabInfoConductor conductor={conductor} />
        </TabsContent>

        <TabsContent value="asignaciones" className="pt-4">
          <TabAsignacionesConductor
            conductor={conductor}
            page={historial.page}
            pageSize={historial.pageSize}
            onPaginacion={(page, pageSize) => setHistorial({ page, pageSize })}
            onAsignarVehiculo={() => setModal('asignar-vehiculo')}
            onVincularDispositivo={() => setModal('vincular-dispositivo')}
            onDesasignarVehiculo={(asignacion) => {
              setADesasignar(asignacion)
              setModal('desasignar-vehiculo')
            }}
            onDesvincularDispositivo={(asignacionId) => {
              setADesvincular(asignacionId)
              setModal('desvincular-dispositivo')
            }}
          />
        </TabsContent>

        <TabsContent value="documentos" className="pt-4">
          <TabDocumentosConductor conductor={conductor} />
        </TabsContent>

        {/*
          Actividad: superficie ⚠ DEGRADADA (A-1). Telemetria no modela conductores ni persiste
          historico de posiciones, asi que `GET .../recorridos` responde SIEMPRE 500
          `flota.telemetria.no_disponible`. Se declara sin pedirlo: disparar un request cuyo unico
          desenlace posible es un 500 mete un error en la consola de todos los usuarios.

          Tampoco se dibuja el selector de rango: sin endpoint que lo reciba, seria un control que no
          hace nada.
        */}
        <TabsContent value="actividad" className="pt-4">
          <EstadoVacio
            variante="sin-datos"
            icono={Route}
            titulo={t('flota:conductorDetalle.actividad.sinFuenteTitulo')}
            descripcion={t('flota:conductorDetalle.actividad.sinFuenteDescripcion')}
          />
        </TabsContent>
      </Tabs>

      {/*
        Los modales se montan solo mientras estan abiertos, y es a proposito: asi el formulario toma
        sus valores del conductor ACTUAL cada vez que se abre, y el error de un intento anterior no
        reaparece en el siguiente.
      */}
      <ModalEditarConductor
        conductor={conductor}
        abierto={modal === 'editar'}
        onCerrar={() => setModal('ninguno')}
      />

      <ModalCambiarEstadoConductor
        conductor={conductor}
        abierto={modal === 'estado'}
        onCerrar={() => setModal('ninguno')}
      />

      <ModalAsignarVehiculo
        conductor={conductor}
        abierto={modal === 'asignar-vehiculo'}
        onCerrar={() => setModal('ninguno')}
      />

      <ModalVincularDispositivo
        conductor={conductor}
        abierto={modal === 'vincular-dispositivo'}
        onCerrar={() => setModal('ninguno')}
      />

      <ModalDesasignarVehiculo
        asignacion={aDesasignar}
        nombreConductor={
          conductor.nombreCompleto ?? t('flota:conductoresListado.celda.sinNombre')
        }
        abierto={modal === 'desasignar-vehiculo'}
        onCerrar={() => {
          setADesasignar(null)
          setModal('ninguno')
        }}
      />

      <ModalDesvincularDispositivo
        conductorId={conductor.id}
        vinculo={vinculo}
        abierto={modal === 'desvincular-dispositivo'}
        onCerrar={() => {
          setADesvincular(null)
          setModal('ninguno')
        }}
      />

      {/*
        BAJA LOGICA DESDE LA FICHA: hay que IRSE de la URL, igual que con el hard-delete de abajo, y
        por la MISMA causa aunque la operacion sea reversible. `GET /conductores/{id}` sale por
        `ObtenerCompuesto`, que no levanta el query filter global (`x => x.Activo`): apenas la baja
        se aplica, el refetch del detalle vuelve **404** y la pantalla dice "este conductor no existe
        o no pertenece a tu organizacion" sobre alguien que el usuario acaba de dar de baja a
        proposito, y que sigue existiendo. Desde el LISTADO no hace falta: ahi la fila se va de la
        tabla y eso ES el resultado (y "Reactivar" sigue en el kebab de la fila).
      */}
      <DialogoBajaConductor
        conductor={conductor}
        abierto={modal === 'baja'}
        onCerrar={() => setModal('ninguno')}
        onHecho={() => navigate('/app/flota/conductores', { replace: true })}
      />

      <DialogoReactivarConductor
        conductor={conductor}
        abierto={modal === 'reactivar'}
        onCerrar={() => setModal('ninguno')}
      />

      {/*
        HARD-DELETE DESDE LA FICHA: hay que IRSE de la URL, no solo cerrar el diálogo.
        La fila deja de existir, el hook invalida el prefijo y el refetch del detalle vuelve 404: sin
        este `navigate`, el usuario que acaba de borrar bien se queda leyendo "este conductor no
        existe o no pertenece a tu organización" — un 404 uniforme que le habla de otra organización
        sobre algo que él mismo borró.

        Va acá y NO en `useEliminarConductor`: el mismo hook lo usa el listado, donde quedarse es lo
        correcto (ver la fila desaparecer ES el resultado de la acción).
      */}
      <DialogoEliminarConductor
        conductor={conductor}
        abierto={modal === 'eliminar'}
        onCerrar={() => setModal('ninguno')}
        onEliminado={() => navigate('/app/flota/conductores', { replace: true })}
      />
    </div>
  )
}

function EnlaceVolver() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <Link
      to="/app/flota/conductores"
      className="inline-flex w-fit items-center gap-1.5 text-sm text-fg-secundario hover:text-fg-primario"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {t('flota:comun.volverAConductores')}
    </Link>
  )
}

/**
 * 404 UNIFORME. Cubre "no existe" y "existe pero es de otra organizacion": el backend filtra por
 * `OrganizacionId` en el WHERE, asi que los dos casos son indistinguibles — y eso es **deliberado**,
 * un 403 confirmaria que el id existe en otra organizacion.
 */
function ConductorNoEncontrado() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <EstadoVacio
      variante="sin-resultados"
      icono={UserRound}
      titulo={t('flota:conductorDetalle.noEncontrado.titulo')}
      descripcion={t('flota:conductorDetalle.noEncontrado.descripcion')}
      acciones={
        <Boton variante="secundaria" render={<Link to="/app/flota/conductores" />}>
          {t('flota:comun.volverAConductores')}
        </Boton>
      }
    />
  )
}
