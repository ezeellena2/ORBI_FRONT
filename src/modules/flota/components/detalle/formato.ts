/**
 * Formateo de los datos del detalle. Vive acá y no en cada componente para que el mismo número no
 * se vea con separador de miles en un panel y sin él en el de al lado.
 *
 * Todas las fechas del backend llegan en UTC (ISO 8601); el frontend las convierte al huso local
 * del navegador, que es lo que manda la convención de la plataforma.
 */

/** Marcador único de dato ausente. No se escribe `'—'` suelto en ningún componente. */
export const SIN_DATO = '—'

export function formatearNumero(valor: number | null | undefined, idioma: string): string {
  if (valor === null || valor === undefined) return SIN_DATO
  return new Intl.NumberFormat(idioma).format(valor)
}

export function formatearFecha(iso: string | null | undefined, idioma: string): string {
  if (!iso) return SIN_DATO

  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return SIN_DATO

  return new Intl.DateTimeFormat(idioma, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(fecha)
}

/**
 * Fecha CALENDARIA, sin hora: la que el backend tipa como `DateOnly?` y serializa `"2026-09-05"`.
 *
 * ⚠️ NO uses `formatearFecha` con estas: `new Date("2026-09-05")` es medianoche **UTC**, y al
 * formatearla en el huso local de `America/Argentina/Buenos_Aires` (UTC-3) sale **el 4**. El bug se
 * veía en la ficha del conductor con la fecha y el contador del backend contradiciéndose en el mismo
 * renglón: "04 de sept de 2026 · en 24 días" para una licencia que vence el **05**.
 *
 * Fijar `timeZone: 'UTC'` deshace exactamente el corrimiento que introdujo el parseo. Lo que NO se
 * puede hacer es fijarlo en `formatearFecha`: sus otros call sites son `DateTime` (instantes reales)
 * y ahí el huso local es lo correcto.
 */
export function formatearFechaSola(iso: string | null | undefined, idioma: string): string {
  if (!iso) return SIN_DATO

  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return SIN_DATO

  return new Intl.DateTimeFormat(idioma, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(fecha)
}

export function formatearFechaHora(iso: string | null | undefined, idioma: string): string {
  if (!iso) return SIN_DATO

  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return SIN_DATO

  return new Intl.DateTimeFormat(idioma, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha)
}

/**
 * Texto del subtítulo del hero: `marca modelo año · tipo · color`.
 *
 * Los cinco campos son nullable en el backend (la proyección canónica puede no estar vigente), así
 * que se arma con los que existan y se omiten los que no. Devuelve `null` cuando no hay ninguno:
 * quien llama decide si esconde la línea o muestra su fallback — nunca se emite `"null null · null"`.
 */
export function componerSubtitulo(partes: Array<string | number | null | undefined>): string | null {
  const presentes = partes
    .filter((parte): parte is string | number => parte !== null && parte !== undefined)
    .map((parte) => String(parte).trim())
    .filter((parte) => parte.length > 0)

  return presentes.length > 0 ? presentes.join(' · ') : null
}
