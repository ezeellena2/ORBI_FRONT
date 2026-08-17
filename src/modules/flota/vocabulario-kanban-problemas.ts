import type { EstadoProblema, ProblemaOperativoListItemDto } from '@/services/contracts/flota'
import { TRANSICION_DE_ESTADO_DISPONIBLE } from './vocabulario-centro-problemas'

/**
 * Vocabulario del TABLERO KANBAN (`?vista=kanban`) — columnas, agrupamiento y el ciclo de
 * movimiento con su rollback.
 *
 * Igual que la Sala y la línea de tiempo, esta vista **no tiene endpoint propio**: agrupa la misma
 * respuesta de `GET /problemas` que ya está cargada. Todo lo que muestra es de **la página**, no de
 * la organización, y la pantalla lo rotula.
 *
 * ══ LA DECISIÓN DE ESTE ARCHIVO: EL DRAG NO SE ARMA ════════════════════════════════════════════
 * `POST /problemas/{problemaId}/estado` **no está enrutado** (falta el body en `dtos.ts` y falta el
 * catálogo `transiciones_problema_flota`, que ni se creó). La fundación de este slice ya lo dejó
 * anclado en `CAPACIDADES_BLOQUEADAS_DEL_CENTRO.cambiarEstadoDeProblema` con
 * `endpointEnrutado: false`, que significa literalmente **no emitas el request**: un `POST` a esa
 * URL rebota en el router con un **404 sin `code`**, indistinguible de "el problema no existe" y sin
 * nada que la pantalla pueda mostrarle al usuario.
 *
 * `f-08` manda construir el drag "igual, con rollback". Al construirlo aparece un hecho que la ficha
 * no anticipa y que decide la forma de la pantalla:
 *
 *   **Sin request no hay ventana en vuelo, así que el estado optimista es INOBSERVABLE.**
 *
 * Aplicar el movimiento y revertirlo ocurre dentro del mismo commit de React: la card **nunca se
 * ve** en la columna destino. Para que el usuario viera el rollback habría que introducir una
 * demora artificial — o sea **simular un viaje al servidor**, que es exactamente el `simToast` del
 * mockup que `f-08` paso 7 prohíbe portar. Entonces "drag + rollback" degenera en *"arrastro, no
 * pasa nada, aparece un cartel"*, que es el modo de falla que este paso existe para evitar: el
 * operador lo lee como "la pantalla está rota" y vuelve a arrastrar.
 *
 * ⇒ **El drag queda deshabilitado, con el motivo a la vista ANTES de intentarlo** (regla dura del
 * módulo: *"nunca un control para una operación que el backend no puede completar; o no va, o va
 * deshabilitada con el motivo visible"*). El tablero se construye entero igual y **el ciclo
 * optimista → rollback vive acá abajo, probado**: es la pieza que tiene que ser correcta el día que
 * el endpoint exista, y la que `f-08` paso 7 pide anclar por property test.
 *
 * El día que el PO cierre el body + el catálogo de transiciones:
 * `CAPACIDADES_BLOQUEADAS_DEL_CENTRO.cambiarEstadoDeProblema.endpointEnrutado` pasa a `true`,
 * `ARRASTRE_DE_CARDS_DISPONIBLE` se enciende solo, el service gana `cambiarEstado` y el ciclo de
 * abajo tiene su llamador — **sin que la pantalla cambie de forma**.
 */

/* ══ 1. Las 4 columnas ═════════════════════════════════════════════════════════════════════════ */

/**
 * Las 4 columnas de la ficha §4.2, en orden de avance del caso.
 *
 * `esperando_externo` **no existe en el catálogo de 7 estados**: es DA-PC-03, y el paso manda
 * renderizarla **vacía e inerte** en vez de derivarla de `integracion.ultimoEstado` "por ahora" —
 * derivarla sería inventar la definición que el PO todavía no dio, y encima sobre un campo que hoy
 * llega neutro siempre (DRIFT 7).
 */
export const COLUMNAS_DEL_TABLERO = [
  'detectado',
  'en_analisis',
  'esperando_externo',
  'resuelto_hoy',
] as const

export type ColumnaDelTablero = (typeof COLUMNAS_DEL_TABLERO)[number]

/** ⚠️ DA-PC-03 abierta: la columna se dibuja y **nunca se puebla**. Decide el PO. */
export const COLUMNA_ESPERANDO_EXTERNO_DEFINIDA = false

/**
 * Estado del problema → columna.
 *
 * ⚠️ **`silenciado` no cae en ninguna de las 4 columnas de la ficha, y no es un olvido de este
 * código: es un hueco de la ficha.** El catálogo tiene 7 estados y las 4 columnas cubren 6
 * (`detectado`, `priorizado`, `asignado`, `en_analisis`, `resuelto`, `descartado`). Un problema
 * silenciado —que es un caso **abierto**, con su SLA corriendo— desaparecería del tablero sin dejar
 * rastro. Por eso devuelve `null` y la vista lo **cuenta y lo declara**
 * (`contarFueraDelTablero`), igual que el mapa tuvo que declarar los vehículos sin posición
 * (D-S5M-2). **PENDIENTE**: ¿5.ª columna, o los silenciados van a "En análisis"? Decide el PO.
 *
 * ⚠️ `asignado` va a **Detectado**: la ficha dice *"`detectado`/`priorizado`/`asignado` **sin
 * tomar**"* y **no existe ningún campo de "tomado"** en el DTO ni en el catálogo. Se aplica la
 * parte que sí es verificable y el matiz queda declarado, no inventado.
 */
const COLUMNA_POR_ESTADO: Record<EstadoProblema, ColumnaDelTablero | null> = {
  detectado: 'detectado',
  priorizado: 'detectado',
  asignado: 'detectado',
  en_analisis: 'en_analisis',
  silenciado: null,
  resuelto: 'resuelto_hoy',
  descartado: 'resuelto_hoy',
}

/**
 * ¿Los dos instantes caen en el mismo **día calendario del cliente**?
 *
 * Es lo que DA-PC-16 deja abierto: nadie definió la ventana de "hoy" de la organización (no hay
 * jornada, ni huso de la org, ni cierre de día en ninguna tabla). Se usa el día local del navegador
 * y **la columna lo rotula**: fingir un filtro server-side sería peor, porque `GET /problemas` no
 * acepta `desde`/`hasta` (B-17) y el recorte no existe del lado del servidor.
 */
export function esDelMismoDiaLocal(isoUtc: string, ahoraMs: number): boolean {
  const instante = new Date(isoUtc)
  if (Number.isNaN(instante.getTime())) return false

  const ahora = new Date(ahoraMs)

  return (
    instante.getFullYear() === ahora.getFullYear() &&
    instante.getMonth() === ahora.getMonth() &&
    instante.getDate() === ahora.getDate()
  )
}

/**
 * Columna natural de un problema, o `null` si no entra en el tablero.
 *
 * Los terminales usan `fechaActualizacionUtc` y no `fechaDeteccionUtc`: el cierre es lo último que
 * le pasó al problema, y un caso detectado anteayer y resuelto hoy tiene que aparecer en
 * "Resuelto hoy". Es una aproximación —**no hay columna de fecha de cierre**— y está declarada.
 */
export function columnaDeProblema(
  problema: ProblemaOperativoListItemDto,
  ahoraMs: number,
): ColumnaDelTablero | null {
  const columna = COLUMNA_POR_ESTADO[problema.estado]
  if (columna === null) return null

  if (columna !== 'resuelto_hoy') return columna

  return esDelMismoDiaLocal(problema.fechaActualizacionUtc, ahoraMs) ? 'resuelto_hoy' : null
}

/* ══ 2. Agrupamiento ══════════════════════════════════════════════════════════════════════════ */

export type ProblemasPorColumna = Readonly<
  Record<ColumnaDelTablero, readonly ProblemaOperativoListItemDto[]>
>

/**
 * Agrupa la página en las 4 columnas, **conservando el orden del servidor** dentro de cada una
 * (prioridad DESC, detección DESC, id DESC). El front no reordena: hacerlo partiría el orden entre
 * páginas, igual que en la cola de la Sala.
 *
 * `overrides` es el estado optimista del tablero: `problemaId → columna` mientras un movimiento
 * está en vuelo. Hoy siempre viaja vacío (ver el encabezado del archivo).
 */
export function agruparEnColumnas(
  items: readonly ProblemaOperativoListItemDto[],
  ahoraMs: number,
  overrides: OverridesDelTablero = {},
): ProblemasPorColumna {
  const grupos: Record<ColumnaDelTablero, ProblemaOperativoListItemDto[]> = {
    detectado: [],
    en_analisis: [],
    esperando_externo: [],
    resuelto_hoy: [],
  }

  for (const item of items) {
    const columna = overrides[item.id] ?? columnaDeProblema(item, ahoraMs)
    if (columna !== null) grupos[columna].push(item)
  }

  return grupos
}

/**
 * Los problemas de la página que **no entran en ninguna columna**, contados por causa.
 *
 * Sin esto desaparecen en silencio: el operador ve 6 cards sobre una bandeja de 9 y no tiene forma
 * de saber que faltan 3. Las 2 causas son reales y distintas, y la pantalla las dice por separado
 * porque piden lecturas opuestas — un silenciado sigue **abierto** y su plazo corre; un terminal de
 * otro día ya está cerrado.
 */
export interface FueraDelTablero {
  readonly silenciados: number
  /** `resuelto` / `descartado` cuya última actualización no es de hoy. */
  readonly cerradosDeOtroDia: number
  readonly total: number
}

export function contarFueraDelTablero(
  items: readonly ProblemaOperativoListItemDto[],
  ahoraMs: number,
): FueraDelTablero {
  let silenciados = 0
  let cerradosDeOtroDia = 0

  for (const item of items) {
    if (columnaDeProblema(item, ahoraMs) !== null) continue

    if (item.estado === 'silenciado') silenciados += 1
    else cerradosDeOtroDia += 1
  }

  return { silenciados, cerradosDeOtroDia, total: silenciados + cerradosDeOtroDia }
}

/**
 * Cuántas cards muestra "Resuelto hoy" antes del "ver N más" (ficha §4.2).
 *
 * Solo esa columna se recorta, y con motivo: es la única acumulativa (todo lo que se cierra en el
 * día se queda ahí), así que sin recorte empuja a las otras 3 fuera de la pantalla. Las abiertas
 * son trabajo pendiente y se muestran completas.
 */
export const MAXIMO_VISIBLE_RESUELTO_HOY = 3

export function columnaSeRecorta(columna: ColumnaDelTablero): boolean {
  return columna === 'resuelto_hoy'
}

/* ══ 3. Claves i18n (concatenación ⇒ las ancla el test) ═══════════════════════════════════════ */

export function claveDeColumnaDelTablero(columna: ColumnaDelTablero): string {
  return `centro.kanban.columna.${columna}`
}

/** La línea que explica qué agrupa la columna. Sin ella, "Detectado" con un `asignado` adentro confunde. */
export function claveDeAyudaDeColumna(columna: ColumnaDelTablero): string {
  return `centro.kanban.columnaAyuda.${columna}`
}

/* ══ 4. El ciclo de movimiento: optimista → rollback ══════════════════════════════════════════ */

/**
 * ¿Se puede arrastrar una card?
 *
 * Hoy **no**, y el motivo está en el encabezado de este archivo. Se deriva de la capacidad
 * bloqueada y **no se escribe `false` a mano**: así hay un solo lugar que tocar el día que el PO
 * cierre la decisión, y el test se pone rojo si alguien lo enciende sin cablear el service.
 */
export const ARRASTRE_DE_CARDS_DISPONIBLE = TRANSICION_DE_ESTADO_DISPONIBLE

/** Estado optimista del tablero: `problemaId → columna` mientras el cambio está en vuelo. */
export type OverridesDelTablero = Readonly<Record<string, ColumnaDelTablero>>

/**
 * Un movimiento de card, con **lo que hacía falta para deshacerlo exactamente**.
 *
 * `overridePrevio` no es redundante con `desde`: si la card estaba en su columna natural no había
 * ninguna entrada en el mapa, y revertir escribiendo `desde` dejaría una clave que antes no
 * existía. El estado resultante se vería igual en pantalla y **no sería el mismo objeto**, así que
 * una secuencia de movimientos revertidos iría acumulando basura. Por eso el reducer lo captura al
 * construir el movimiento y no al revertirlo.
 */
export interface MovimientoDeCard {
  readonly problemaId: string
  readonly desde: ColumnaDelTablero
  readonly hacia: ColumnaDelTablero
  readonly overridePrevio: ColumnaDelTablero | null
}

/** Construye el movimiento capturando el override que existía. Es el único constructor legítimo. */
export function movimientoDeCard(
  overrides: OverridesDelTablero,
  problemaId: string,
  desde: ColumnaDelTablero,
  hacia: ColumnaDelTablero,
): MovimientoDeCard {
  return {
    problemaId,
    desde,
    hacia,
    overridePrevio: overrides[problemaId] ?? null,
  }
}

/** La card pasa a la columna destino **antes** de que el servidor conteste. */
export function aplicarMovimientoOptimista(
  overrides: OverridesDelTablero,
  movimiento: MovimientoDeCard,
): OverridesDelTablero {
  return { ...overrides, [movimiento.problemaId]: movimiento.hacia }
}

/**
 * ROLLBACK (criterio C-8): la card vuelve **exactamente** a donde estaba.
 *
 * "Exactamente" es literal: si no había override, la clave se **borra**, no se reescribe. Nunca
 * queda una card mostrando un estado que no se persistió, y el mapa no acumula entradas muertas.
 */
export function revertirMovimiento(
  overrides: OverridesDelTablero,
  movimiento: MovimientoDeCard,
): OverridesDelTablero {
  if (movimiento.overridePrevio !== null) {
    return { ...overrides, [movimiento.problemaId]: movimiento.overridePrevio }
  }

  const siguiente = { ...overrides }
  delete siguiente[movimiento.problemaId]
  return siguiente
}

/**
 * Los destinos que un drag libre puede aceptar.
 *
 * ⚠️ **`resuelto_hoy` NO es destino de drag** (ficha §4.2 / `f-08` paso 5): resolver exige
 * `resultado` + `evidencia` obligatorios y es **terminal e irreversible**, así que soltar una card
 * ahí abriría el modal Resolver, nunca persistiría el cierre por sí solo. Y `esperando_externo`
 * tampoco: no existe como estado (DA-PC-03), así que no hay nada que persistir.
 */
export function columnaAceptaDrop(columna: ColumnaDelTablero): boolean {
  return columna === 'detectado' || columna === 'en_analisis'
}
