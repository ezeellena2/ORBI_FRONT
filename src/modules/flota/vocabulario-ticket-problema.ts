import type {
  ProblemaOperativoDetalleDto,
  ProblemaPrioridadDto,
} from '@/services/contracts/flota'
import { CAPACIDADES_BLOQUEADAS_DEL_CENTRO } from './vocabulario-centro-problemas'

/**
 * Vocabulario del TICKET (`?ticket=<problemaId>`) — la vista completa de un caso.
 *
 * A diferencia de la Sala, el timeline y el kanban, el ticket **sí tiene endpoint propio**:
 * `GET /problemas/{problemaId}`. Es la única vista del Centro que no agrupa una página, así que acá
 * no hay derivados "de la página" — lo que se muestra es del problema.
 *
 * ══ LO QUE ESTA VISTA TIENE QUE DECIR SIN QUE SE LO PREGUNTEN ══════════════════════════════════
 * Tres campos del detalle llegan **neutros siempre**, y los tres son partial-data por construcción
 * del esquema, no estados del problema. Presentarlos como estado sería afirmar algo falso:
 *  1. `webhooks: []` + `integracion: { enviado: false, ultimoEstado: null }` — **ninguna columna ata
 *     una entrega de webhook a un problema**. No es "no se envió nada": es que esa correlación no
 *     existe todavía (DRIFT 7).
 *  2. `sla.estado` nunca vale `por_vencer` — ningún documento fija el umbral (DRIFT 5).
 *  3. `contextoOperativo.criticidadActivo` viaja `null` — el modelo no tiene marca de activo
 *     crítico (DRIFT 6).
 *
 * Y uno que se ve como un error de cálculo si no se explica: `sum(factores[].puntos)` puede ser
 * **menor** que `prioridad` (DRIFT 8). Ver `desfasajeDePrioridad`.
 */

/* ══ 1. Los 4 tabs ════════════════════════════════════════════════════════════════════════════ */

/**
 * Los 4 de la ficha §6. **Los 4 se dibujan**, incluido el que hoy no tiene fuente.
 *
 * `regla` es el caso interesante: el vínculo problema → regla **no existe como columna**
 * (PENDIENTE #8) y no hay endpoint de resumen (DA-PC-01), así que su contenido sería 4 métricas en
 * `—`. Se dibuja igual y **declara por qué**, que es el precedente ya establecido en el módulo con
 * los tabs Historial, Eventos y Actividad: un tab que falta esconde que la capacidad existe; un tab
 * lleno de guiones parece una pantalla rota. El tab explica y no emite ningún request.
 */
export const TABS_DEL_TICKET = ['resumen', 'timeline', 'regla', 'integraciones'] as const

export type TabDelTicket = (typeof TABS_DEL_TICKET)[number]

export function claveDeTabDelTicket(tab: TabDelTicket): string {
  return `centro.ticket.tabs.${tab}`
}

/**
 * ¿El tab lleva contador al lado del título?
 *
 * Solo los que cuentan algo **real**. `integraciones` NO lo lleva: su lista está vacía siempre por
 * el DRIFT 7, y un `(0)` al lado del título afirma "cero entregas" — que es exactamente la lectura
 * equivocada. El panel dice la verdad con palabras.
 */
export function tabLlevaContador(tab: TabDelTicket): boolean {
  return tab === 'timeline'
}

/* ══ 2. La prioridad explicada ════════════════════════════════════════════════════════════════ */

export function sumaDeFactores(prioridad: ProblemaPrioridadDto): number {
  return prioridad.factores.reduce((total, factor) => total + factor.puntos, 0)
}

/**
 * La diferencia entre la prioridad **persistida** y la suma de los factores que llegaron.
 *
 * ⚠️ **`f-09` paso 4 pide lo contrario a lo que el contrato permite.** El paso dice: *"la suma
 * mostrada debe ser exactamente la `prioridad` del hero (test de componente, no prosa)"*. El
 * contrato dice que **no cuadra siempre**: 3 de los 7 factores se recomponen al leer y no tienen
 * snapshot en la fila (DRIFT 8), así que un problema priorizado ayer puede traer factores que suman
 * menos que su prioridad guardada.
 *
 * Anclar el "cuadre" como invariante de pantalla haría fallar la UI con datos legítimos, o —peor—
 * empujaría a "arreglar" la suma inventando el resto. Se muestra el desglose **como explicación**,
 * se muestran los dos números, y cuando difieren la pantalla **lo dice**. Manda el contrato
 * (`00-contrato/` > `03-build/`).
 *
 * Positivo = la prioridad persistida es mayor que lo que los factores explican hoy.
 */
export function desfasajeDePrioridad(prioridad: ProblemaPrioridadDto): number {
  return prioridad.prioridad - sumaDeFactores(prioridad)
}

export function hayDesfasajeDePrioridad(prioridad: ProblemaPrioridadDto): boolean {
  return desfasajeDePrioridad(prioridad) !== 0
}

/* ══ 3. Lo que el ticket NO dibuja, y por qué ═════════════════════════════════════════════════ */

/**
 * ⚠️ **El tab "Contexto regla" no tiene de dónde sacar la regla.**
 *
 * `ProblemaOperativoDetalleDto` no trae `reglaId` ni el código de la regla que abrió el caso, y
 * **ninguna columna ata el problema a su regla** (PENDIENTE #8). Las stats de 30 días (disparos, %
 * sin acción, MTTR, falsos positivos) son además DA-PC-01: no existe endpoint de resumen.
 *
 * ⇒ El tab declara la ausencia y ofrece lo único real: el link a la pantalla de Reglas.
 */
export const CONTEXTO_DE_REGLA_DISPONIBLE = false

/**
 * ⚠️ **La correlación problema ↔ entrega de webhook no existe.**
 *
 * La entrega guarda `webhook_endpoint_id` + `event_id`, y el `EventId` del evento de negocio **no
 * se persiste** en el problema. Por eso `webhooks[]` llega `[]` y `integracion` llega neutro,
 * **siempre**, incluso en una organización con webhooks configurados y entregas exitosas.
 *
 * ⇒ El tab Integraciones **no puede decir "no se envió nada"**: eso sería una afirmación sobre los
 * envíos. Dice que la trazabilidad por problema todavía no existe, y remite a la pantalla de
 * Integraciones, donde las entregas **sí** se ven (a nivel endpoint).
 */
export const CORRELACION_PROBLEMA_WEBHOOK_DISPONIBLE = false

/** `POST /problemas/{id}/comentarios` no está enrutado (PENDIENTE #17). No se dibuja el input. */
export const COMENTARIOS_DISPONIBLES =
  CAPACIDADES_BLOQUEADAS_DEL_CENTRO.comentarProblema.endpointEnrutado

/**
 * ⚠️ **Las 6 acciones de incidente (ficha §7.6) no se dibujan**: no existe el concepto de cluster en
 * el contrato — ningún campo permite saber que dos problemas son el mismo caso correlacionado (ver
 * `INCIDENTES_AGRUPADOS_DISPONIBLES` en `vocabulario-sala-problemas`, que trae el `grep`).
 *
 * Sin cluster no hay hijos sobre los cuales hacer el fan-out que `f-09` paso 9 describe, así que
 * tampoco hay "resultado por hijo" que reportar.
 */
export const ACCIONES_DE_INCIDENTE_DISPONIBLES = false

/**
 * ⚠️ **"Contactar conductor" (ficha §7.8) no se dibuja.**
 *
 * Su efecto contratado es *"registra en timeline"*, y los 2 endpoints que podrían escribir una fila
 * de timeline —`/comentarios` y `/estado`— **no están enrutados**. Una acción operativa que no puede
 * dejar rastro de lo que el operador hizo es peor que no tenerla: el próximo turno no se entera de
 * que alguien ya llamó.
 */
export const CONTACTAR_CONDUCTOR_DISPONIBLE = false

/* ══ 4. Derivados del detalle ═════════════════════════════════════════════════════════════════ */

/**
 * Cuántas filas tiene la línea de tiempo del problema.
 *
 * `comentarios` es un **subconjunto** de `timeline` (las filas con `tipo: 'comentario'`, mismo
 * shape), así que sumarlos contaría dos veces lo mismo. El contador del tab cuenta el feed.
 */
export function contarTimeline(detalle: ProblemaOperativoDetalleDto): number {
  return detalle.timeline.length
}

/**
 * ¿Este problema todavía admite operar sobre él?
 *
 * No se recalcula del estado: **`accionesDisponibles` la deriva el servidor** (terminal ⇒ solo las 2
 * de navegación). Se lee la lista. Recalcularlo del lado del cliente es cómo dos superficies de la
 * misma pantalla terminan en desacuerdo.
 */
export function tieneAccionesDeMutacion(detalle: ProblemaOperativoDetalleDto): boolean {
  return detalle.accionesDisponibles.some(
    (accion) => accion === 'asignar' || accion === 'silenciar' || accion === 'resolver',
  )
}
