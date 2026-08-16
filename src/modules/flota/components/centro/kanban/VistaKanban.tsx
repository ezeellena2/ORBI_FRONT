import { useTranslation } from 'react-i18next'
import { Inbox, Lock } from 'lucide-react'
import type { PaginationMetadata, ProblemaOperativoListItemDto } from '@/services/contracts/flota'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Paginacion } from '@/shared/ui/Paginacion'
import { ColumnaDelTablero } from './ColumnaDelTablero'
import { usePermisos } from '../../../hooks/usePermisos'
import {
  ARRASTRE_DE_CARDS_DISPONIBLE,
  COLUMNAS_DEL_TABLERO,
  agruparEnColumnas,
  contarFueraDelTablero,
} from '../../../vocabulario-kanban-problemas'
import {
  OPCIONES_TAMANO_PAGINA_PROBLEMAS,
  claveDelVacioDeLaBandeja,
} from '../../../vocabulario-sala-problemas'

const PERMISO_GESTIONAR = 'flota.problemas.gestionar'

/**
 * Vista **Kanban** del Centro de Problemas (`?vista=kanban`, ficha §4.2).
 *
 * Las 4 columnas por estado sobre la **misma** respuesta paginada que la Sala y la línea de tiempo:
 * no hay endpoint de tablero. Todo lo que el tablero cuenta es de la página, y lo dice arriba.
 *
 * ══ POR QUÉ LAS CARDS NO SE ARRASTRAN ══════════════════════════════════════════════════════════
 * `POST /problemas/{problemaId}/estado` **no está enrutado** (falta el body en `dtos.ts` y falta el
 * catálogo de transiciones, que ni se creó), así que ningún movimiento se puede persistir.
 *
 * `f-08` manda construir el drag "con rollback", y al construirlo aparece el hecho que decide la
 * forma de esta pantalla: **sin request no hay ventana en vuelo**, así que el estado optimista es
 * inobservable — la card nunca llegaría a verse en la columna destino. Hacerlo visible exigiría una
 * demora artificial, o sea **simular un viaje al servidor**, que es el `simToast` del mockup que el
 * propio paso prohíbe portar. El resultado sería "arrastro, no pasa nada, aparece un cartel": el
 * modo de falla que este paso existe para evitar.
 *
 * ⇒ El drag va **apagado con el motivo a la vista ANTES de intentarlo**: un aviso permanente arriba
 * del tablero (no un toast que se va) y el asa de cada card con su tooltip. El ciclo
 * optimista → **ROLLBACK** vive probado en `vocabulario-kanban-problemas.ts` con su property test
 * (criterio C-8), que es la pieza que tiene que ser correcta el día que el endpoint exista.
 *
 * ══ LO QUE ESTA VISTA NO DIBUJA ════════════════════════════════════════════════════════════════
 *  - **Toolbar de búsqueda del tablero** (ficha §5) — **B-17**: `GET /problemas` no acepta ningún
 *    filtro, el binder los descarta y devuelve la lista sin filtrar. Buscar sobre la página cargada
 *    daría "los que coinciden **y** cayeron en esta página", que se lee como el resultado completo.
 *  - **Sección de incidentes / badges de cluster** — el concepto no existe en el contrato.
 */
export function VistaKanban({
  problemas,
  hayRespuesta,
  cargando,
  error,
  onReintentar,
  paginacion,
  onPagina,
  ahoraMs,
}: {
  problemas: readonly ProblemaOperativoListItemDto[]
  /**
   * ¿Llegó alguna respuesta del servidor? **No es `problemas.length > 0`**: con `keepPreviousData`
   * y una bandeja vacía —el único estado alcanzable hoy— un refetch fallado pintaba el error dos
   * veces y borraba el vacío que explica por qué el tablero está así. Ver `VistaSala`.
   */
  hayRespuesta: boolean
  cargando: boolean
  error: unknown
  onReintentar: () => void
  paginacion: PaginationMetadata | null
  onPagina: (cambio: { pagina: number; tamanoPagina: number }) => void
  /**
   * "Ahora" para decidir qué cierre es **de hoy**. Entra por parámetro y no se lee `Date.now()` acá:
   * es impuro en render (`react-hooks/purity` lo rechaza) y además el sello de React Query es el
   * mismo que usa el resto del Centro, así que las 3 vistas coinciden en qué hora es.
   */
  ahoraMs: number
}) {
  const { t } = useTranslation('flota')
  const { t: tComun } = useTranslation()
  const { tienePermiso } = usePermisos()

  const apiError = error ? parseApiError(error) : null

  const grupos = agruparEnColumnas(problemas, ahoraMs)
  const fuera = contarFueraDelTablero(problemas, ahoraMs)

  /*
    2 motivos independientes y no intercambiables. El de contrato gana: no se resuelve pidiéndole el
    permiso a nadie. El de permiso solo aparece cuando el de contrato ya no existe.
  */
  const motivoDeArrastreApagado = !ARRASTRE_DE_CARDS_DISPONIBLE
    ? t('centroBloqueado.cambiarEstado')
    : t('centro.sala.acciones.sinPermiso', { permiso: PERMISO_GESTIONAR })

  const arrastrable = ARRASTRE_DE_CARDS_DISPONIBLE && tienePermiso(PERMISO_GESTIONAR)

  if (apiError !== null && !hayRespuesta) {
    return (
      <EstadoError
        variante="recuperable"
        titulo={t('centro.problemas.error.titulo')}
        mensaje={resolveApiErrorMessage(apiError, tComun)}
        trazaId={apiError.traceId ?? undefined}
        textoReintentar={t('centro.problemas.error.reintentar')}
        onReintentar={onReintentar}
      />
    )
  }

  if (!cargando && problemas.length === 0) {
    const claveDelVacio = claveDelVacioDeLaBandeja()

    return (
      <EstadoVacio
        variante="sin-datos"
        icono={Inbox}
        titulo={t(`${claveDelVacio}.titulo`)}
        descripcion={t(`${claveDelVacio}.descripcion`)}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <AvisoDeTableroBloqueado motivo={motivoDeArrastreApagado} apagado={!arrastrable} />

      <p className="text-xs text-fg-terciario">{t('centro.kanban.aclaracionPagina')}</p>

      {/*
        Las cards que no entran en ninguna columna se DECLARAN. Sin esto desaparecen en silencio: el
        operador ve 6 cards sobre una bandeja de 9 y no tiene con qué saber que faltan 3. Las 2
        causas van por separado porque piden lecturas opuestas — un silenciado sigue ABIERTO y su
        plazo corre; un cerrado de otro día ya terminó.
      */}
      {fuera.silenciados === 0 ? null : (
        <p className="text-xs text-fg-terciario">
          {t('centro.kanban.fueraDelTableroSilenciados', { count: fuera.silenciados })}
        </p>
      )}

      {fuera.cerradosDeOtroDia === 0 ? null : (
        <p className="text-xs text-fg-terciario">
          {t('centro.kanban.fueraDelTableroCerrados', { count: fuera.cerradosDeOtroDia })}
        </p>
      )}

      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1">
        {COLUMNAS_DEL_TABLERO.map((columna) => (
          <ColumnaDelTablero
            key={columna}
            columna={columna}
            problemas={grupos[columna]}
            cargando={cargando && !hayRespuesta}
            arrastrable={arrastrable}
            motivoDeArrastreApagado={motivoDeArrastreApagado}
          />
        ))}
      </div>

      {paginacion !== null && paginacion.totalItems > 0 ? (
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
      ) : null}
    </div>
  )
}

/**
 * El aviso que hace que el tablero no mienta.
 *
 * Es **permanente y va antes de cualquier intento**, no un toast después de arrastrar: un aviso que
 * aparece recién cuando el usuario falló, y que después se va, es lo que produce el "lo intento de
 * nuevo, debe haber sido la red". Acá el operador lee por qué las cards no se mueven **antes** de
 * tocar ninguna, y el texto dice que no es una falla momentánea.
 */
function AvisoDeTableroBloqueado({ motivo, apagado }: { motivo: string; apagado: boolean }) {
  if (!apagado) return null

  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
      <Lock className="mt-0.5 size-4 shrink-0 text-fg-terciario" aria-hidden />
      {motivo}
    </p>
  )
}
