import type { ReactNode } from 'react'

/**
 * Bloque titulado del Centro de Problemas.
 *
 * Existe como componente y no como 6 líneas repetidas en cada panel porque los mismos bloques
 * ("Qué pasó", "Señales agrupadas", "Estado en vivo", "Prioridad") aparecen en la Sala y en el
 * ticket: si el encabezado se escribe dos veces, las dos vistas del mismo problema terminan con
 * jerarquías distintas.
 */
export function BloqueDelCentro({
  titulo,
  children,
}: {
  /** Ya resuelto por i18n. */
  titulo: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold tracking-wide text-fg-terciario uppercase">{titulo}</p>
      {children}
    </section>
  )
}
