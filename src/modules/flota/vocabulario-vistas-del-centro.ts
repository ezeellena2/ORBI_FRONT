/**
 * Cómo se conmuta la vista del Centro de Problemas.
 *
 * ══ QUERY STRING, NUNCA HASH (C-10, cerrado) ═══════════════════════════════════════════════════
 * Una sola URL (`/app/flota/problemas`) con 4 vistas conmutadas por `?vista=` y `?ticket=`. El
 * mockup usa `#vista=`; el hash **no llega al servidor, no lo ve `useSearchParams` y rompe el
 * deep-link compartido**. Acá el estado de la pantalla vive en la query, así que compartir el link
 * y el botón "atrás" del navegador funcionan sin código extra.
 *
 * Este archivo es la única fuente de qué valores son válidos y qué pasa con los que no.
 */

/** Las 3 vistas de lista. La 4.ª superficie de la ficha (`?ticket=`) no es un valor de `?vista=`. */
export const VISTAS_DEL_CENTRO = ['sala', 'timeline', 'kanban'] as const

export type VistaDelCentro = (typeof VISTAS_DEL_CENTRO)[number]

/** Sin `?vista=`, la Sala. Es la vista principal del Centro (ficha §2). */
export const VISTA_POR_DEFECTO: VistaDelCentro = 'sala'

export const PARAM_VISTA = 'vista'
export const PARAM_TICKET = 'ticket'

/**
 * Traduce el `?vista=` de la URL a una vista construida.
 *
 * Todo lo que no sea una vista conocida —vacío, un typo, un valor viejo— cae en la Sala. La
 * alternativa (404 interno) castigaría al usuario por un link viejo cuando hay una pantalla
 * perfectamente útil para mostrarle.
 */
export function vistaDesdeLaUrl(valor: string | null): VistaDelCentro {
  return (VISTAS_DEL_CENTRO as readonly string[]).includes(valor ?? '')
    ? (valor as VistaDelCentro)
    : VISTA_POR_DEFECTO
}

/**
 * ✅ **`?ticket=` GANA sobre `?vista=`** desde que `f-09` construyó la vista completa.
 *
 * `f-06` lo había diferido con esta constante en `false`: mientras el ticket no existía,
 * `?ticket=<id>` **preseleccionaba** el problema en el panel de detalle de la Sala, porque un
 * deep-link que aterriza en un placeholder es peor que uno que aterriza en el problema.
 *
 * Con la vista construida, el param vuelve a su significado contratado (ficha §8) y hay una
 * consecuencia que conviene tener escrita: **la selección de la Sala dejó de vivir en la URL**. Es
 * lo que la ficha describe —1.er click *"selecciona en el panel Detalle — **no navega**"*— y era la
 * improvisación de `f-06` la que la había puesto en la query. Lo que se pierde es poder compartir un
 * link con un chip preseleccionado; para eso está justamente `?ticket=`, que ahora abre el caso
 * entero.
 */
export const TICKET_COMPLETO_DISPONIBLE = true

/** El `problemaId` del deep-link, o `null`. El vacío se trata como ausente. */
export function problemaDelDeepLink(valor: string | null): string | null {
  const id = (valor ?? '').trim()
  return id === '' ? null : id
}

/**
 * ¿La URL pide el ticket completo?
 *
 * Vive acá y no como un `if` en la página para que la regla "el ticket gana sobre la vista" tenga un
 * solo dueño: el día que alguien agregue una 4.ª vista de lista, no hay que acordarse de este
 * precedencia.
 */
export function ticketDeLaUrl(valorDelParam: string | null): string | null {
  if (!TICKET_COMPLETO_DISPONIBLE) return null
  return problemaDelDeepLink(valorDelParam)
}
