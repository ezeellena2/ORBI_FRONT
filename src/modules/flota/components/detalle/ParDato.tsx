import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { SIN_DATO } from './formato'

/**
 * Par label/valor de los paneles de la ficha.
 *
 * `valor` acepta `null`/`undefined` y cae al marcador de dato ausente en un solo lugar: es lo que
 * evita que una celda imprima "null" y otra un string vacío que parece un bug de layout. Con un
 * `ReactNode` (un `Badge`, por ejemplo) se renderiza tal cual.
 */
export function ParDato({
  etiqueta,
  valor,
  mono = false,
}: {
  /** Ya resuelto por i18n. */
  etiqueta: string
  valor: ReactNode
  /** Patentes, VIN, años y kilómetros: datos que se leen carácter por carácter. */
  mono?: boolean
}) {
  const vacio = valor === null || valor === undefined || valor === ''

  return (
    <div className="flex flex-col gap-1 border-b border-borde py-2 last:border-b-0">
      <dt className="text-xs text-fg-secundario">{etiqueta}</dt>
      <dd
        className={cn(
          'text-sm',
          vacio ? 'text-fg-terciario' : 'text-fg-primario',
          mono ? 'font-mono tracking-wide' : '',
        )}
      >
        {vacio ? SIN_DATO : valor}
      </dd>
    </div>
  )
}
