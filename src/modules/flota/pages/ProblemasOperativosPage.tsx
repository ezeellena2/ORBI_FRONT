import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Aviso } from '@/shared/ui/Aviso'
import { SubmenuDelCentro } from '../components/centro/SubmenuDelCentro'
import { VistaKanban } from '../components/centro/kanban/VistaKanban'
import { VistaSala } from '../components/centro/sala/VistaSala'
import { VistaTicket } from '../components/centro/ticket/VistaTicket'
import { VistaTimeline } from '../components/centro/timeline/VistaTimeline'
import { useProblemas } from '../hooks/useProblemas'
import type { ProblemaOperativoListItemDto } from '@/services/contracts/flota'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Boton } from '@/shared/ui/Boton'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import { Spinner } from '@/shared/ui/Spinner'
import {
  PAGE_SIZE_PROBLEMAS_DEFAULT,
  hayMasDeUnaPagina,
  resumenDeLaPagina,
} from '../vocabulario-sala-problemas'
import {
  PARAM_TICKET,
  PARAM_VISTA,
  ticketDeLaUrl,
  vistaDesdeLaUrl,
  type VistaDelCentro,
} from '../vocabulario-vistas-del-centro'

/**
 * `/app/flota/problemas` — el Centro de Problemas: la bandeja accionable de la flota.
 *
 * ══ CÓMO SE CONMUTA LA VISTA ═══════════════════════════════════════════════════════════════════
 * **Query string, nunca hash** (C-10): `?vista=sala|timeline|kanban` y `?ticket=<problemaId>`. El
 * hash del mockup no lo ve `useSearchParams`, no viaja al servidor y rompe el link compartido. Acá
 * el estado de la pantalla vive en la URL, así que compartir y el botón "atrás" funcionan sin código
 * extra.
 *
 * **`?ticket=` gana sobre `?vista=`** (ficha §8): el ticket es una zona distinta —tiene su propia
 * barra de retorno y no lleva submenú ni encabezado de lista— y hace **su propio** `GET`. Por eso el
 * componente se parte en dos: el shell de listas tiene el hook de la bandeja y el ticket el suyo, y
 * ninguno pide lo que no va a mostrar.
 *
 * ══ LO QUE ESTA PANTALLA NO DIBUJA, Y NO ES UN OLVIDO ══════════════════════════════════════════
 *  - **Toolbar de filtros** (búsqueda, severidad, origen, responsable, solo-incidentes) — **B-17**:
 *    `api.md` dice "listado paginado con filtros" y **no nombra ninguno**; el binder descarta lo que
 *    no conoce y devuelve la lista **sin filtrar**, en silencio. Un chip que se manda y no filtra ya
 *    rompió dos veces en este módulo (D-S3-33). Dibujarla deshabilitada tampoco: son 6 controles
 *    muertos permanentes arriba de la vista principal.
 *  - **Botón Exportar** — **B-34**: su único camino de error (400 por más de 10.000 filas) no tiene
 *    `code`, así que `GET /problemas/exportar` no se construyó del lado del servidor.
 *  - **Botón Asignar del header** — **DA-PC-07**: no existe catálogo de asignables. La acción sí
 *    aparece en la barra de acciones del problema, **deshabilitada con su motivo**, que es donde el
 *    usuario puede entender por qué.
 *  - **Las 5 mini-stats de la ficha §3** — 3 son inderivables sin mentir (`por_vencer` nunca se
 *    emite, los incidentes no existen en el contrato, el MTTR es DA-PC-01) y las otras 2 solo valen
 *    sobre la página. En su lugar va el total real del servidor + un resumen **rotulado** de la
 *    página. El detalle está en `resumenDeLaPagina`.
 */
export default function ProblemasOperativosPage() {
  const [parametros] = useSearchParams()

  const problemaId = ticketDeLaUrl(parametros.get(PARAM_TICKET))

  return problemaId === null ? <ShellDeListas /> : <VistaTicket problemaId={problemaId} />
}

const PERMISO_LECTURA = 'flota.problemas.leer'

/** Las 3 vistas de lista, que comparten una sola respuesta paginada de `GET /problemas`. */
function ShellDeListas() {
  const { t } = useTranslation('flota')
  const { t: tComun } = useTranslation()
  const navigate = useNavigate()
  const [parametros, setParametros] = useSearchParams()

  /*
    Paginación en estado LOCAL y no en un store persistido, a diferencia de los 3 listados.
    El motivo: los stores de filtros existen para que los filtros sobrevivan a la navegación, y acá
    **no hay filtros** (B-17). Persistir solo el número de página haría que volver al Centro
    aterrizara en la página 4 de una bandeja que cambió, sin ninguna pista de por qué.
  */
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(PAGE_SIZE_PROBLEMAS_DEFAULT)

  const consulta = useProblemas({ page: pagina, pageSize: tamanoPagina })

  const vista = vistaDesdeLaUrl(parametros.get(PARAM_VISTA))

  const problemas = consulta.data?.items ?? []
  const paginacion = consulta.data?.pagination ?? null
  const apiError = consulta.error ? parseApiError(consulta.error) : null

  // ── FORBIDDEN ────────────────────────────────────────────────────────────────────────────────
  // El page-gate por claim lo aplica `FlotaRoutes` con `<RequierePermiso>`. Esto cubre el OTRO
  // forbidden: el backend dijo 403 igual (permiso revocado con la sesión abierta, o módulo no
  // activo). Overlay que BLOQUEA, nunca redirect (B-3): un redirect le hace creer al usuario que la
  // pantalla no existe. El `permiso` es siempre el literal, jamás `apiError.code` — el 403 del gate
  // de módulo trae `flota.modulo.no_activo`, que no está en el catálogo de 44 permisos.
  if (apiError?.status === 403) {
    return (
      <div className="relative min-h-96 flex-1">
        <SinAccesoOverlay
          permiso={PERMISO_LECTURA}
          titulo={t('centro.problemas.sinAcceso.titulo')}
          descripcion={t('centro.problemas.sinAcceso.descripcion', { permiso: PERMISO_LECTURA })}
          onVolver={() => navigate('/app')}
          textoVolver={t('centro.problemas.sinAcceso.volver')}
        />
      </div>
    )
  }

  /**
   * **Respuesta recibida**, no "hay items". Se lo pasa a las 3 vistas (`hayRespuesta`) para que la
   * página y la superficie usen la MISMA definición: hasta el cierre de slice-06 la página decía
   * `data !== undefined` y las vistas `problemas.length > 0`, así que con la bandeja vacía —el único
   * estado alcanzable hoy— un refetch fallado pintaba el error dos veces y borraba el vacío.
   */
  const hayDatosEnMano = consulta.data !== undefined

  function irA(vistaDestino: VistaDelCentro) {
    setParametros({ [PARAM_VISTA]: vistaDestino })
  }

  function cambiarPagina(cambio: { pagina: number; tamanoPagina: number }) {
    if (cambio.tamanoPagina !== tamanoPagina) {
      setTamanoPagina(cambio.tamanoPagina)
      setPagina(1)
      return
    }
    setPagina(cambio.pagina)
  }

  /*
    El "ahora" sale de los sellos de React Query y no de `Date.now()`, por 2 motivos: es impura en
    render (`react-hooks/purity` la rechaza) y además `dataUpdatedAt` solo avanza en ÉXITO — con la
    red cortada, la línea "ahora" del timeline y la ventana de "hoy" del kanban quedarían congeladas
    mientras el aviso de arriba dice que no se pudo actualizar. Tomar el máximo con `errorUpdatedAt`
    corre el "ahora" en cada intento fallido. Es exactamente lo que D-S5M-3 corrigió en el mapa.
  */
  const ahoraMs = Math.max(consulta.dataUpdatedAt, consulta.errorUpdatedAt)

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
      <Encabezado
        total={paginacion?.totalItems}
        problemas={problemas}
        variasPaginas={hayMasDeUnaPagina(paginacion)}
        refrescando={consulta.isFetching}
      />

      {/*
        Un refetch fallado NO borra la bandeja que ya estaba cargada: con datos en mano es
        partial-data —el aviso arriba, con su reintento— y no una pantalla de error. Sin datos, el
        panel de error lo pinta cada vista, que es la que sabe qué superficie reemplazar.
      */}
      {apiError !== null && hayDatosEnMano ? (
        <Aviso
          titulo={t('centro.problemas.error.tituloRefresco')}
          mensaje={resolveApiErrorMessage(apiError, tComun)}
          trazaId={apiError.traceId}
          accion={
            <Boton variante="secundaria" tamano="sm" onClick={() => void consulta.refetch()}>
              {t('centro.problemas.error.reintentar')}
            </Boton>
          }
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <SubmenuDelCentro activo={vista} onVista={irA} />

        {vista === 'sala' ? (
          <VistaSala
            problemas={problemas}
            hayRespuesta={hayDatosEnMano}
            cargando={consulta.isPending}
            error={consulta.error}
            onReintentar={() => void consulta.refetch()}
            paginacion={paginacion}
            onPagina={cambiarPagina}
          />
        ) : null}

        {vista === 'timeline' ? (
          <VistaTimeline
            problemas={problemas}
            hayRespuesta={hayDatosEnMano}
            cargando={consulta.isPending}
            error={consulta.error}
            onReintentar={() => void consulta.refetch()}
            ahoraMs={ahoraMs}
            onAbrirProblema={(problemaId) =>
              // Desde el timeline SÍ es navegación: se abre el ticket. Se empuja una entrada nueva
              // para que la barra de retorno del ticket devuelva a la línea de tiempo.
              setParametros({ [PARAM_TICKET]: problemaId })
            }
          />
        ) : null}

        {vista === 'kanban' ? (
          <VistaKanban
            problemas={problemas}
            hayRespuesta={hayDatosEnMano}
            cargando={consulta.isPending}
            error={consulta.error}
            onReintentar={() => void consulta.refetch()}
            paginacion={paginacion}
            onPagina={cambiarPagina}
            ahoraMs={ahoraMs}
          />
        ) : null}
      </div>
    </section>
  )
}

/**
 * Encabezado con el total **del servidor** y un resumen **de la página**.
 *
 * Son dos cosas distintas y por eso se dicen distinto: `pagination.totalItems` es el total real de
 * problemas de la organización (verdad del servidor, se puede afirmar sin adjetivos), y los conteos
 * por severidad/plazo salen de las filas cargadas. Mezclarlos daría un número que cambia al paginar
 * y que el usuario leería como "toda mi flota".
 */
function Encabezado({
  total,
  problemas,
  variasPaginas,
  refrescando,
}: {
  total: number | undefined
  problemas: readonly ProblemaOperativoListItemDto[]
  variasPaginas: boolean
  refrescando: boolean
}) {
  const { t } = useTranslation('flota')

  const resumen = resumenDeLaPagina(problemas)

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-snug text-fg-primario">
          {t('centro.problemas.titulo')}
        </h1>
        <p className="text-sm text-fg-secundario">{t('centro.problemas.subtitulo')}</p>

        {total === undefined ? null : (
          <p className="text-xs text-fg-terciario">{t('centro.problemas.total', { count: total })}</p>
        )}

        {/*
          Una sola clave interpolada y no 4 fragmentos concatenados en el JSX: el orden de las
          palabras es parte de la traducción, y armar la frase acá la deja fija en el orden del
          español.
        */}
        {resumen.enPagina === 0 ? null : (
          <p className="text-xs text-fg-terciario">
            {t('centro.problemas.resumen.linea', { ...resumen })}
          </p>
        )}

        {/* La aclaración solo cuando hace falta: con una sola página, "de esta página" es ruido. */}
        {variasPaginas ? (
          <p className="text-xs text-fg-terciario">{t('centro.problemas.resumen.aclaracion')}</p>
        ) : null}
      </div>

      {/* `aria-live="off"`: anunciar "actualizando" en cada refetch vuelve la pantalla inusable. */}
      {refrescando ? (
        <span className="flex items-center gap-2 text-xs text-fg-terciario" aria-live="off">
          <Spinner tamano="sm" />
          {t('centro.problemas.actualizando')}
        </span>
      ) : null}
    </header>
  )
}
