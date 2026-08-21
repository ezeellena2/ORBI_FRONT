import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import type { ProblemaOperativoListItemDto, SeveridadProblema } from '@/services/contracts/flota'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Skeleton } from '@/shared/ui/Skeleton'
import { cn } from '@/shared/utils/cn'
import { AccionConMotivo } from '../../AccionConMotivo'
import { claseDeFondoPorVariante, formatearInstanteCorto } from '../formato-centro'
import { usePermisos } from '@/shared/auth/permissions/usePermisos'
import {
  SEVERIDADES_PROBLEMA,
  claveDeOrigenSenal,
  claveDeSeveridadProblema,
  varianteDeSeveridadProblema,
} from '../../../vocabulario-centro-problemas'
import { claveDelVacioDeLaBandeja } from '../../../vocabulario-sala-problemas'
import {
  type CarrilDeOrigen,
  type VentanaDelTimeline,
  carrilesPorOrigen,
  contarFueraDeLosCarriles,
  instanteDeDeteccion,
  marcasDelEje,
  posicionEnLaVentana,
  ventanaDelTimeline,
} from '../../../vocabulario-timeline-problemas'

/**
 * Vista **Línea de tiempo** (`?vista=timeline`): los mismos problemas de la Sala, ubicados en el
 * tiempo y agrupados por origen. **No hay endpoint de timeline**: lee la misma respuesta paginada.
 *
 * ── LA VENTANA SE DERIVA DE LOS DATOS, Y EL EJE LO DICE ───────────────────────────────────────
 * El mockup dibuja un eje fijo de 24 h. Nuestros datos **no están acotados a 24 h** (`GET
 * /problemas` no acepta `desde`/`hasta`, B-17), así que un eje de hora-del-día pondría un problema
 * de hace 3 días en la misma X que uno de hoy. La ventana va del más viejo hasta ahora y el
 * encabezado declara el período; nada se filtra y nada se esconde. El razonamiento completo está en
 * `vocabulario-timeline-problemas.ts`.
 *
 * ── LO QUE NO SE DIBUJA ───────────────────────────────────────────────────────────────────────
 * Los 3 chips de rango (no hay params: B-17) · los clusters (no existe el concepto de incidente en
 * el contrato) · la tira de insights derivados (no hay endpoint de resumen: DA-PC-01) · las 4
 * mini-stats informativas (misma causa). Cada ausencia tiene su constante declarada con el motivo.
 */
export function VistaTimeline({
  problemas,
  hayRespuesta,
  cargando,
  error,
  onReintentar,
  ahoraMs,
  onAbrirProblema,
}: {
  problemas: readonly ProblemaOperativoListItemDto[]
  /**
   * ¿Llegó alguna respuesta del servidor? **No es `problemas.length > 0`**: con `keepPreviousData`
   * y una bandeja vacía —el único estado alcanzable hoy— un refetch fallado pintaba el error dos
   * veces y borraba el vacío que explica por qué no hay eventos. Ver `VistaSala`.
   */
  hayRespuesta: boolean
  cargando: boolean
  error: unknown
  onReintentar: () => void
  /**
   * El "ahora" contra el que se ubica la línea vertical.
   *
   * Entra por parámetro y **no se lee `Date.now()` en render**: un reloj impuro produce una posición
   * distinta en cada re-render sin que haya cambiado ningún dato, y `react-hooks/purity` lo rechaza.
   * La página lo deriva de los sellos de React Query, igual que el mapa (`instanteDeReferencia`).
   */
  ahoraMs: number
  onAbrirProblema: (problemaId: string) => void
}) {
  const { t } = useTranslation('flota')
  const { t: tComun } = useTranslation()

  const apiError = error ? parseApiError(error) : null

  if (cargando && problemas.length === 0) {
    return (
      <Marco>
        <Skeleton variante="fila-tabla" repetir={8} />
      </Marco>
    )
  }

  if (apiError !== null && !hayRespuesta) {
    return (
      <Marco>
        <EstadoError
          variante="recuperable"
          titulo={t('centro.problemas.error.titulo')}
          mensaje={resolveApiErrorMessage(apiError, tComun)}
          trazaId={apiError.traceId ?? undefined}
          textoReintentar={t('centro.problemas.error.reintentar')}
          onReintentar={onReintentar}
        />
      </Marco>
    )
  }

  const ventana = ventanaDelTimeline(problemas, ahoraMs)

  if (ventana === null) {
    // Mismo vacío que la Sala, a propósito: es la misma bandeja vista de otra forma, así que
    // inventarle un copy propio ("no hay eventos en el rango") le echaría la culpa a un rango que
    // el usuario ni siquiera puede elegir.
    const clave = claveDelVacioDeLaBandeja()

    return (
      <Marco>
        <EstadoVacio
          variante="sin-datos"
          icono={CalendarClock}
          titulo={t(`${clave}.titulo`)}
          descripcion={t(`${clave}.descripcion`)}
        />
      </Marco>
    )
  }

  const carriles = carrilesPorOrigen(problemas)
  const fuera = contarFueraDeLosCarriles(problemas)

  return (
    <Marco>
      <Encabezado ventana={ventana} fueraDeLosCarriles={fuera} />
      <Eje ventana={ventana} />

      <div className="flex flex-col">
        {carriles.map((carril) => (
          <Carril
            key={carril.origen}
            carril={carril}
            ventana={ventana}
            ahoraMs={ahoraMs}
            onAbrirProblema={onAbrirProblema}
          />
        ))}
      </div>

      <Pie />
    </Marco>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('flota')

  return (
    <section
      aria-label={t('centro.timeline.titulo')}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-borde bg-superficie-1 p-4"
    >
      {children}
    </section>
  )
}

function Encabezado({
  ventana,
  fueraDeLosCarriles,
}: {
  ventana: VentanaDelTimeline
  fueraDeLosCarriles: number
}) {
  const { t, i18n } = useTranslation('flota')

  return (
    <header className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-fg-primario">
        {t('centro.timeline.ventana', {
          desde: formatearInstanteCorto(ventana.desdeMs, i18n.language),
          hasta: formatearInstanteCorto(ventana.hastaMs, i18n.language),
        })}
      </p>
      <p className="text-xs text-fg-terciario">{t('centro.timeline.ventanaAclaracion')}</p>
      <p className="text-xs text-fg-terciario">{t('centro.timeline.aclaracionOrigenes')}</p>

      {/*
        Los que NO se pueden ubicar en ningún carril. Sin esta línea desaparecen de la vista sin
        dejar rastro: el operador ve 7 sobre una bandeja de 9 y no tiene cómo saber que faltan 2.
      */}
      {fueraDeLosCarriles > 0 ? (
        <p className="text-xs text-advertencia">
          {t('centro.timeline.fueraDeLosCarriles', { count: fueraDeLosCarriles })}
        </p>
      ) : null}
    </header>
  )
}

function Eje({ ventana }: { ventana: VentanaDelTimeline }) {
  const { i18n } = useTranslation('flota')

  return (
    <div className="flex items-center gap-2 text-xs text-fg-terciario">
      <span className="w-32 shrink-0" />
      <div className="flex flex-1 justify-between">
        {marcasDelEje(ventana).map((marca) => (
          <span key={marca}>{formatearInstanteCorto(marca, i18n.language)}</span>
        ))}
      </div>
    </div>
  )
}

/**
 * Un carril por origen. Se dibujan **los 8 siempre**, también los vacíos: un carril vacío informa
 * (ese origen existe y hoy no aportó nada) y evita que la vista cambie de forma en cada refresco.
 *
 * El de **geozona** lleva su propia nota: DIFERIDO DA-08, no hay una sola línea de lógica de
 * geozona en la solución, así que nunca se va a poblar por sí solo.
 */
function Carril({
  carril,
  ventana,
  ahoraMs,
  onAbrirProblema,
}: {
  carril: CarrilDeOrigen
  ventana: VentanaDelTimeline
  ahoraMs: number
  onAbrirProblema: (problemaId: string) => void
}) {
  const { t } = useTranslation('flota')

  return (
    <div className="flex items-center gap-2 border-b border-borde py-2 last:border-b-0">
      <div className="flex w-32 shrink-0 flex-col">
        <span className="text-xs font-medium text-fg-primario">
          {t(claveDeOrigenSenal(carril.origen), { defaultValue: carril.origen })}
        </span>
        <span className="text-xs text-fg-terciario">
          {carril.eventos.length === 0
            ? t('centro.timeline.carril.vacio')
            : `${t('centro.timeline.carril.eventos', { count: carril.eventos.length })} · ${t('centro.timeline.carril.criticos', { count: carril.criticos })}`}
        </span>
        {carril.origen === 'geozona' ? (
          <span className="text-xs text-fg-terciario">
            {t('centro.timeline.carril.geozonaDiferido')}
          </span>
        ) : null}
      </div>

      <div className="relative h-8 flex-1 rounded-sm bg-superficie-2">
        {/* Línea "ahora". Es una referencia, no un dato: va detrás de los eventos. */}
        <span
          aria-hidden
          title={t('centro.timeline.ahora')}
          className="absolute top-0 bottom-0 w-px bg-marca"
          style={{ left: `${posicionEnLaVentana(ahoraMs, ventana)}%` }}
        />

        {carril.eventos.map((evento) => (
          <EventoDelCarril
            key={evento.id}
            evento={evento}
            ventana={ventana}
            onAbrir={onAbrirProblema}
          />
        ))}
      </div>
    </div>
  )
}

function EventoDelCarril({
  evento,
  ventana,
  onAbrir,
}: {
  evento: ProblemaOperativoListItemDto
  ventana: VentanaDelTimeline
  onAbrir: (problemaId: string) => void
}) {
  const { t, i18n } = useTranslation('flota')

  const instante = instanteDeDeteccion(evento)
  // `carrilesPorOrigen` ya descarta los que no parsean; el guard existe para que el tipo cierre sin
  // un `!` que mienta sobre la nulabilidad.
  if (instante === null) return null

  const izquierda = posicionEnLaVentana(instante, ventana)

  return (
    <button
      type="button"
      onClick={() => onAbrir(evento.id)}
      // El `title` alcanza acá y un `Tooltip` no: son N botones por carril y el tooltip de Base UI
      // monta un portal por instancia. El texto lleva severidad, estado y hora, que es lo que el
      // mockup pone en su tooltip.
      title={`${evento.titulo} · ${t(claveDeSeveridadProblema(evento.severidad))} · ${formatearInstanteCorto(instante, i18n.language)}`}
      aria-label={t('centro.timeline.evento.abrir', { titulo: evento.titulo })}
      /*
        ⚠️ **Desviación declarada del mínimo de 44×44 px de área táctil.**
        El área real es de 24 px y el punto visible de 12. Es una decisión de densidad, no un
        descuido: sobre un carril de ~600 px con 20 eventos, un blanco de 44 px se solapa con sus
        vecinos y el usuario toca **el problema equivocado**, que es peor que tener que apuntar. El
        mismo problema es alcanzable a tamaño completo desde la cola de la Sala, que sí cumple el
        mínimo — la línea de tiempo es una vista de lectura, no la superficie de acción.
      */
      className="absolute top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
      style={{ left: `${izquierda}%` }}
    >
      <span
        aria-hidden
        className={cn(
          'size-3 rounded-full ring-2 ring-superficie-1',
          claseDeFondoPorVariante(varianteDeSeveridadProblema(evento.severidad)),
        )}
      />
    </button>
  )
}

/**
 * Leyenda + la única acción de la tira de insights que es real.
 *
 * La leyenda son **4** entradas (las severidades del catálogo) y no las 5 del mockup: "Incidente
 * agrupado" no tiene qué representar, y "Resuelto" tampoco es una entrada — el color del punto es la
 * **severidad**, y el estado va en su badge, que es texto. Un punto que a veces significa severidad
 * y a veces estado no se puede leer.
 */
function Pie() {
  const { t } = useTranslation('flota')
  const { tienePermiso } = usePermisos()

  const puedeLeerReglas = tienePermiso('flota.reglas.leer')

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-fg-secundario">
        <span className="text-fg-terciario">{t('centro.timeline.leyenda')}:</span>
        {SEVERIDADES_PROBLEMA.map((severidad: SeveridadProblema) => (
          <span key={severidad} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                'size-2 rounded-full',
                claseDeFondoPorVariante(varianteDeSeveridadProblema(severidad)),
              )}
            />
            {t(claveDeSeveridadProblema(severidad))}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-px bg-marca" />
          {t('centro.timeline.ahora')}
        </span>
      </div>

      {puedeLeerReglas ? (
        <Link to="/app/flota/problemas/reglas" className="text-xs text-marca hover:underline">
          {t('centro.timeline.insight.ajustarRegla')}
        </Link>
      ) : (
        <AccionConMotivo
          motivo={t('centro.submenu.sinPermiso', { permiso: 'flota.reglas.leer' })}
        >
          <span aria-disabled="true" className="cursor-not-allowed text-xs text-fg-terciario">
            {t('centro.timeline.insight.ajustarRegla')}
          </span>
        </AccionConMotivo>
      )}
    </footer>
  )
}
