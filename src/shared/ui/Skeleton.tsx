import { Skeleton as SkeletonBase } from '@/shared/ui/base/skeleton'
import { cn } from '@/shared/utils/cn'

/**
 * Familia D — `Skeleton`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Gaps propios sobre el `skeleton` copiado:
 *  - La variante `fila-tabla`, que es la que más se usa: un esqueleto de fila
 *    con la misma altura que la fila real, para que la tabla no salte al cargar.
 *  - `prefers-reduced-motion`. Un shimmer a pantalla completa es exactamente lo
 *    que esa preferencia existe para apagar; acá se apaga con `motion-reduce`,
 *    además del reset global de `base.css`.
 *  - `repetir`, para no escribir un `.map` en cada pantalla.
 *
 * Accesibilidad: el bloque entero va `aria-hidden`. Un esqueleto no tiene nada
 * que anunciar; quien comunica la carga es el `role="status"` del `Spinner` o
 * el `aria-busy` del contenedor.
 */

export type VarianteSkeleton = 'linea' | 'bloque' | 'circulo' | 'fila-tabla'

const variantes: Record<VarianteSkeleton, string> = {
  linea: 'h-3.5 w-full rounded-sm',
  bloque: 'h-24 w-full rounded-lg',
  circulo: 'size-10 rounded-full',
  'fila-tabla': 'h-11 w-full rounded-sm',
}

export interface SkeletonProps extends React.ComponentProps<'div'> {
  variante?: VarianteSkeleton
  /** Cuántos repetir, apilados con separación. */
  repetir?: number
}

export function Skeleton({ variante = 'linea', repetir = 1, className, ...resto }: SkeletonProps) {
  const piezas = Array.from({ length: Math.max(1, repetir) })

  return (
    <div aria-hidden className="flex w-full flex-col gap-2" {...resto}>
      {piezas.map((_, indice) => (
        <SkeletonBase
          key={indice}
          className={cn(
            'bg-superficie-2 motion-reduce:animate-none',
            variantes[variante],
            className
          )}
        />
      ))}
    </div>
  )
}
