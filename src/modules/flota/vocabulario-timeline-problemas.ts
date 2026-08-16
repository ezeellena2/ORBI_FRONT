import type { OrigenSenal, ProblemaOperativoListItemDto } from '@/services/contracts/flota'
import { ORIGENES_SENAL } from './vocabulario-centro-problemas'

/**
 * Vocabulario de la LÍNEA DE TIEMPO (`?vista=timeline`) — posicionamiento, carriles y ventana.
 *
 * Igual que la Sala, esta vista **no tiene endpoint propio**: lee `GET /problemas`, la misma
 * respuesta paginada. Todo lo que dibuja sale de ahí.
 *
 * ══ EL PROBLEMA CENTRAL DE ESTA VISTA, Y CÓMO SE RESUELVE ══════════════════════════════════════
 * El mockup dibuja un eje de **24 horas** (`00 · 04 · 08 · 12 · 16 · 20 · ahora`) y ubica cada
 * evento por su hora del día. **Nuestros datos no están acotados a 24 horas**: `GET /problemas` no
 * acepta `desde`/`hasta` (B-17) y devuelve los problemas de la organización ordenados por
 * prioridad, sin ninguna restricción temporal. Con un eje de hora-del-día, un problema de hace 3
 * días caería **exactamente en la misma X** que uno de hoy a la misma hora: la pantalla afirmaría
 * simultaneidad donde hay 72 horas de diferencia.
 *
 * Las dos salidas malas eran:
 *  - filtrar client-side a las últimas 24 h y rotularlo "últimas 24 horas" ⇒ miente sobre el
 *    universo (es lo que `f-07` paso 4 prohíbe explícitamente);
 *  - dibujar el eje de 24 h igual ⇒ miente sobre **cuándo** pasó cada cosa.
 *
 * ⇒ La ventana se **deriva de los datos**: va del problema más viejo de la página hasta ahora, y el
 * eje **dice qué período cubre**. Nada se filtra, nada se esconde, y la posición horizontal de cada
 * evento es literalmente cierta. Cuando todos los problemas son del día, la ventana da un día y la
 * vista se ve como el mockup; cuando abarcan una semana, el eje lo dice.
 */

/* ══ 1. La ventana temporal ═══════════════════════════════════════════════════════════════════ */

export interface VentanaDelTimeline {
  readonly desdeMs: number
  readonly hastaMs: number
}

/**
 * Ancho mínimo de la ventana: 1 hora.
 *
 * Sin piso, una página con un solo problema (o con todos en el mismo minuto) da una ventana de
 * ancho 0 y la división para calcular la posición explota o amontona todo en un punto. Con el piso,
 * ese caso se dibuja como "la última hora", que es cierto.
 */
export const VENTANA_MINIMA_MS = 3_600_000

/**
 * Ventana que cubre a todos los eventos de la página, terminando en **ahora**.
 *
 * `hastaMs` es `max(ahora, el evento más nuevo)` y no `ahora` a secas: si el reloj del cliente está
 * atrasado respecto del servidor, un problema detectado "en el futuro" quedaría fuera del track y
 * no se dibujaría. El desfasaje de relojes no puede hacer desaparecer un problema.
 *
 * Devuelve `null` cuando no hay ningún evento ubicable: no hay ventana que declarar y la vista
 * muestra su vacío en vez de un eje inventado.
 */
export function ventanaDelTimeline(
  items: readonly ProblemaOperativoListItemDto[],
  ahoraMs: number,
): VentanaDelTimeline | null {
  const instantes = items
    .map((item) => instanteDeDeteccion(item))
    .filter((valor): valor is number => valor !== null)

  if (instantes.length === 0) return null

  const hastaMs = Math.max(ahoraMs, ...instantes)
  const desdeMs = Math.min(hastaMs - VENTANA_MINIMA_MS, ...instantes)

  return { desdeMs, hastaMs }
}

/** `null` si la fecha no parsea: quien llama decide, nunca se dibuja un `NaN%`. */
export function instanteDeDeteccion(item: ProblemaOperativoListItemDto): number | null {
  const instante = new Date(item.fechaDeteccionUtc).getTime()
  return Number.isNaN(instante) ? null : instante
}

/**
 * Posición horizontal dentro del track, en porcentaje 0..100.
 *
 * Se recorta a [0, 100] a propósito: un evento fuera de la ventana (imposible con
 * `ventanaDelTimeline`, posible si alguien pasa otra ventana) se pega al borde en vez de salir del
 * contenedor y quedar invisible. Un evento que no se ve es un problema que el operador no atiende.
 */
export function posicionEnLaVentana(
  instanteMs: number,
  ventana: VentanaDelTimeline,
): number {
  const ancho = ventana.hastaMs - ventana.desdeMs
  if (ancho <= 0) return 100

  const bruta = ((instanteMs - ventana.desdeMs) / ancho) * 100
  return Math.min(100, Math.max(0, bruta))
}

/**
 * Marcas del eje: `cantidad` instantes repartidos a lo largo de la ventana.
 *
 * Se devuelven como instantes en ms y no como texto formateado porque el formato depende del idioma
 * y del huso del usuario, y este archivo tiene que poder correr en el runner de Node sin `Intl` de
 * navegador. La pantalla los formatea.
 */
export function marcasDelEje(ventana: VentanaDelTimeline, cantidad = 5): number[] {
  const ancho = ventana.hastaMs - ventana.desdeMs
  const pasos = Math.max(2, cantidad) - 1

  return Array.from({ length: pasos + 1 }, (_, indice) =>
    Math.round(ventana.desdeMs + (ancho * indice) / pasos),
  )
}

/* ══ 2. Los carriles por origen ═══════════════════════════════════════════════════════════════ */

export interface CarrilDeOrigen {
  readonly origen: OrigenSenal
  readonly eventos: readonly ProblemaOperativoListItemDto[]
  readonly criticos: number
}

/**
 * Un carril por cada uno de los **8** valores de `OrigenSenal`, siempre los 8 y en el orden del
 * catálogo — también los que quedan vacíos.
 *
 * ── POR QUÉ SIEMPRE LOS 8 ─────────────────────────────────────────────────────────────────────
 * Un carril vacío informa: dice que ese origen existe y que hoy no aportó nada. Dibujar solo los
 * que tienen eventos haría que la vista cambie de forma en cada refresco y esconde que la capacidad
 * existe. En particular el carril **`geozona` se conserva y nunca se puebla** — DIFERIDO DA-08, no
 * hay una sola línea de lógica de geozona en la solución.
 *
 * ── UN PROBLEMA PUEDE APARECER EN VARIOS CARRILES, Y ESO ES CORRECTO ──────────────────────────
 * `origenes[]` son los códigos **distintos** de las señales agrupadas en ese problema: un problema
 * alimentado por telemetría y por diagnóstico sale en los 2 carriles. **Son el mismo caso visto
 * desde dos orígenes, no dos problemas** — por eso los conteos por carril **no suman** el total de
 * la página, y la pantalla lo dice (`centro.timeline.aclaracionOrigenes`). Sumarlos y presentar el
 * resultado como "N eventos" sería contar dos veces el mismo problema.
 */
export function carrilesPorOrigen(
  items: readonly ProblemaOperativoListItemDto[],
): CarrilDeOrigen[] {
  return ORIGENES_SENAL.map((origen) => {
    const eventos = items.filter(
      (item) => item.origenes.includes(origen) && instanteDeDeteccion(item) !== null,
    )

    return {
      origen,
      eventos,
      criticos: eventos.filter((evento) => evento.severidad === 'critica').length,
    }
  })
}

/**
 * Cuántos problemas de la página **no entran en ningún carril**.
 *
 * Dos causas, las dos reales y las dos silenciosas si no se cuentan:
 *  1. `origenes: []` — el contrato lo declara posible ("puede venir vacío"), y pasa cuando el
 *    problema todavía no tiene señales con origen conocido;
 *  2. `fechaDeteccionUtc` que no parsea — no se puede ubicar en el eje.
 *
 * Sin este conteo, esos problemas **desaparecen de la vista sin dejar rastro**: el operador ve 7
 * eventos sobre una bandeja de 9 y no tiene forma de saber que faltan 2. Es la misma clase de
 * hallazgo que el "N de tus vehículos no aparecen en el mapa" de slice-05 (D-S5M-2).
 */
export function contarFueraDeLosCarriles(
  items: readonly ProblemaOperativoListItemDto[],
): number {
  return items.filter(
    (item) => item.origenes.length === 0 || instanteDeDeteccion(item) === null,
  ).length
}

/* ══ 3. Lo que la línea de tiempo NO dibuja, y por qué ════════════════════════════════════════ */

/**
 * ⚠️ **Los 3 chips de rango (24 h / 7 d / 30 d) NO se dibujan.**
 *
 * `api.md` §Problemas **no declara** `desde` ni `hasta` (misma PENDIENTE B-17 que los filtros), así
 * que no hay forma de pedirle otro período al servidor. Las 2 alternativas al no dibujarlos eran
 * peores:
 *  - **chips deshabilitados** (lo que pedía `f-07` paso 4): 3 controles muertos permanentes arriba
 *    de la vista principal, con la misma lógica por la que la Sala **no** dibuja su toolbar (regla
 *    del orquestador: *"un chip que se manda y no filtra es peor que uno ausente"*, extendida a
 *    *"un control que nunca se va a poder tocar es ruido"*);
 *  - **filtrar client-side** y rotularlo "últimas 24 horas": mentiría sobre el universo de datos.
 *
 * ⇒ En su lugar la vista **declara el período que efectivamente cubre** (derivado de los datos, ver
 * `ventanaDelTimeline`) y dice que todavía no se puede elegir otro. El día que B-17 cierre, los
 * chips entran y mandan el filtro real.
 */
export const RANGO_TEMPORAL_ELEGIBLE = false

/**
 * ⚠️ **Los clusters (badge agrupado que salta a la Sala) NO se dibujan**: no existe el concepto de
 * incidente en el contrato. Ver `INCIDENTES_AGRUPADOS_DISPONIBLES` en `vocabulario-sala-problemas`,
 * que es donde está el detalle y el `grep` que lo verifica.
 *
 * Consecuencia sobre la leyenda: son **4 entradas** (crítica / alta / media / baja) y no las 5 del
 * mockup — "Incidente agrupado" no tiene qué representar. `resuelto` tampoco es una entrada de
 * leyenda: el color del punto es la **severidad**, y el estado del problema va en su badge, que es
 * texto. Un punto que a veces significa severidad y a veces estado no se puede leer.
 */
export const CLUSTERS_EN_TIMELINE_DISPONIBLES = false

/**
 * ⚠️ **La tira de insights NO se dibuja.**
 *
 * Los insights del mockup ("Pico anormal en GPS a las 09:30 — 5 GPS reportaron caída de señal en 4
 * minutos, probable corte del proveedor") son **analítica derivada**: pico, origen más ruidoso,
 * ventana de silencio, correlación. Nada de eso sale de `ProblemaOperativoListItemDto` ni existe
 * endpoint de resumen (**DA-PC-01**), y calcularlo sobre una página de 20 filas ordenadas por
 * prioridad daría un "pico" que cambia al paginar.
 *
 * Lo único de la tira que **sí** es real es el enlace "Ajustar regla", que es navegación a
 * `/app/flota/problemas/reglas`. Eso se conserva; el resto no se fabrica.
 */
export const INSIGHTS_DERIVADOS_DISPONIBLES = false
