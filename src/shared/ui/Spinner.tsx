import { cn } from '@/shared/utils/cn'

/**
 * Familia D — `Spinner`. Origen: PROPIO (02-primitivas.md, mapa de cobertura).
 * shadcn/ui no lo cubre y no tiene comportamiento accesible complejo: es un SVG
 * más una animación tokenizada.
 *
 * Accesibilidad: `role="status"` + un texto solo para lector de pantalla. Sin
 * eso, para quien usa lector de pantalla la pantalla simplemente no dice nada
 * mientras carga.
 */

export type TamanoSpinner = 'sm' | 'md' | 'lg'

const tamanos: Record<TamanoSpinner, string> = {
  sm: 'size-3.5 border-2',
  md: 'size-5 border-2',
  lg: 'size-8 border-[3px]',
}

export interface SpinnerProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  tamano?: TamanoSpinner
  /** Texto para lector de pantalla. Ya resuelto por i18n antes de llegar acá. */
  etiqueta?: string
}

export function Spinner({ tamano = 'md', etiqueta, className, ...resto }: SpinnerProps) {
  return (
    <div role="status" className={cn('inline-flex items-center', className)} {...resto}>
      <span
        aria-hidden
        className={cn(
          'animate-spin rounded-full border-borde border-t-marca',
          tamanos[tamano]
        )}
      />
      {etiqueta ? <span className="sr-only">{etiqueta}</span> : null}
    </div>
  )
}
