import { Separator } from '@/shared/ui/base/separator'
import { cn } from '@/shared/utils/cn'

/**
 * Familia E — `Divisor`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Gap propio: la `etiqueta` opcional en el medio ("o", "Datos del vehículo").
 * Cuando hay etiqueta, el separador deja de ser un `role="separator"` puro y
 * pasa a ser un contenedor con dos líneas y texto: la línea se marca
 * `aria-hidden` y el texto queda como contenido real, para que un lector de
 * pantalla lea "Datos del vehículo" y no "separador".
 */

export interface DivisorProps extends React.ComponentProps<typeof Separator> {
  /** Texto en el medio del divisor. Ya resuelto por i18n. */
  etiqueta?: string
}

export function Divisor({
  etiqueta,
  orientation = 'horizontal',
  className,
  ...resto
}: DivisorProps) {
  if (!etiqueta) {
    return (
      <Separator orientation={orientation} className={cn('bg-borde', className)} {...resto} />
    )
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span aria-hidden className="h-px flex-1 bg-borde" />
      <span className="text-xs font-medium tracking-wider text-fg-secundario uppercase">
        {etiqueta}
      </span>
      <span aria-hidden className="h-px flex-1 bg-borde" />
    </div>
  )
}
