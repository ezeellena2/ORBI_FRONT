import type { VarianteBadge } from '@/shared/ui/Badge'

/**
 * Formateo y clases compartidos por las vistas del Centro de Problemas.
 *
 * Vive acá y no repetido en cada componente para que el mismo instante no se vea con un formato en
 * la cola y con otro en el carril de al lado — que es exactamente cómo dos partes de la misma
 * pantalla terminan contradiciéndose.
 */

/**
 * Color de relleno por variante semántica.
 *
 * Es el mismo mapa que `Badge` usa para su punto, replicado acá porque la barra de severidad del
 * chip y el punto del evento del timeline **no son badges**: son superficies de color puro, sin
 * texto propio, que acompañan a un badge que sí lo tiene. Se replica el mapa y no se importa el
 * componente porque una `<Badge>` con texto vacío tendría el padding, el borde y la altura de un
 * badge, y acá hacen falta 3 px de barra.
 *
 * ⚠️ Solo utilidades semánticas: ningún color literal, ninguna clase de la paleta default de
 * Tailwind (que además está apagada y rompe el lint).
 */
const FONDO_POR_VARIANTE: Record<VarianteBadge, string> = {
  neutro: 'bg-fg-terciario',
  acento: 'bg-marca',
  accion: 'bg-accion',
  exito: 'bg-exito',
  advertencia: 'bg-advertencia',
  peligro: 'bg-peligro',
  info: 'bg-info',
}

export function claseDeFondoPorVariante(variante: VarianteBadge): string {
  return FONDO_POR_VARIANTE[variante]
}

/**
 * Instante corto para el eje de la línea de tiempo: día + hora local.
 *
 * Lleva el **día** y no solo la hora, y eso no es verbosidad: la ventana del timeline se deriva de
 * los datos y puede abarcar varios días (`GET /problemas` no filtra por fecha, B-17). Un eje que
 * dijera solo `09:00 · 13:00 · 17:00` sobre una ventana de 3 días afirmaría que todo pasó el mismo
 * día.
 */
export function formatearInstanteCorto(ms: number, idioma: string): string {
  return new Intl.DateTimeFormat(idioma, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))
}
