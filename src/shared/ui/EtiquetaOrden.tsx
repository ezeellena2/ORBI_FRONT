import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { DireccionOrden } from '@/shared/ui/Columna'
import { Icono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'

/**
 * Familia C — `EtiquetaOrden`. Origen: PROPIO (02-primitivas.md).
 *
 * Es el indicador de orden de un encabezado de tabla. Lo que la hace algo más
 * que una flechita es `aria-sort`, que va en el `<th>` y es lo único que le
 * dice a un lector de pantalla por qué columna está ordenada la tabla y en qué
 * dirección. `Tabla` lo pone; este componente dibuja la señal visual y expone
 * el mapeo dirección → valor de `aria-sort` para que las dos cosas no puedan
 * divergir.
 *
 * El estado `sin-orden` tiene su propio ícono (no es "ausencia de ícono"):
 * si la columna es ordenable, tiene que verse que se puede hacer click.
 */

export type EstadoEtiquetaOrden = DireccionOrden | 'sin-orden'

export function ariaSortDe(estado: EstadoEtiquetaOrden): 'ascending' | 'descending' | 'none' {
  if (estado === 'asc') return 'ascending'
  if (estado === 'desc') return 'descending'
  return 'none'
}

export interface EtiquetaOrdenProps extends React.ComponentProps<'span'> {
  estado: EstadoEtiquetaOrden
}

export function EtiquetaOrden({ estado, className, ...resto }: EtiquetaOrdenProps) {
  const icono = estado === 'asc' ? ArrowUp : estado === 'desc' ? ArrowDown : ChevronsUpDown

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex items-center',
        estado === 'sin-orden' ? 'text-fg-terciario' : 'text-marca',
        className
      )}
      {...resto}
    >
      <Icono icono={icono} tamano="sm" />
    </span>
  )
}
