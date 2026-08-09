/**
 * Deriva las iniciales de un nombre completo: primera letra del primer nombre
 * más primera del último. Máximo dos.
 *
 * Vive en `utils/` y no adentro de `Avatar.tsx` por una razón concreta: es lo
 * que evita que cada pantalla escriba su propio `split(' ').map(...)` y que la
 * misma persona aparezca con iniciales distintas según el módulo. Acá tiene un
 * solo dueño y un test.
 */
export function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}
