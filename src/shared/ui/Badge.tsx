import { cva, type VariantProps } from 'class-variance-authority'
import type { LucideIcon } from 'lucide-react'
import { Badge as BadgeBase } from '@/shared/ui/base/badge'
import { Icono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'

/**
 * Familia F — `Badge`. Origen: ENVOLVER (02-primitivas.md).
 *
 * ── `Badge` ES TONTO, y eso es la mitad del diseño ─────────────────────────
 * Recibe `variante` y texto. El mapeo `código de catálogo → variante + label`
 * (`en_linea` → verde "En línea") vive en la CAPA 2, en el módulo, con sus
 * tests de mapeo. Si el badge conociera los códigos dejaría de ser transversal
 * y habría que tocarlo cada vez que un módulo agrega un estado.
 *
 * ── El color NUNCA es el único portador de significado ─────────────────────
 * El badge lleva texto siempre, y `punto` o `icono` si hace falta. Motivo:
 * daltonismo, y además una captura en blanco y negro sigue siendo legible.
 * Por eso `punto` e `icono` son props y no una variante de color más.
 *
 * Las 7 variantes son las del catálogo y son SEMÁNTICAS, no estéticas: se dice
 * `peligro`, no `rojo`. El rojo del tema claro puede no ser el mismo rojo, y
 * "rojo" no dice que la acción destruye algo.
 */

const variantesBadge = cva('border', {
  variants: {
    variante: {
      neutro: 'border-borde bg-superficie-2 text-fg-secundario',
      acento: 'border-marca/30 bg-marca-suave text-marca',
      accion: 'border-accion/30 bg-accion-suave text-accion',
      exito: 'border-exito/30 bg-exito-fondo text-exito',
      advertencia: 'border-advertencia/30 bg-advertencia-fondo text-advertencia',
      peligro: 'border-peligro/30 bg-peligro-fondo text-peligro',
      info: 'border-info/30 bg-info-fondo text-info',
    },
  },
  defaultVariants: { variante: 'neutro' },
})

const colorDelPunto = {
  neutro: 'bg-fg-terciario',
  acento: 'bg-marca',
  accion: 'bg-accion',
  exito: 'bg-exito',
  advertencia: 'bg-advertencia',
  peligro: 'bg-peligro',
  info: 'bg-info',
} as const

export type VarianteBadge = NonNullable<VariantProps<typeof variantesBadge>['variante']>

export interface BadgeProps extends Omit<React.ComponentProps<typeof BadgeBase>, 'variant'> {
  variante?: VarianteBadge
  /** Punto de color a la izquierda del texto. */
  punto?: boolean
  icono?: LucideIcon
}

export function Badge({
  variante = 'neutro',
  punto = false,
  icono,
  className,
  children,
  ...resto
}: BadgeProps) {
  return (
    <BadgeBase
      variant="outline"
      className={cn(
        'h-5 gap-1.5 rounded-full px-2 text-xs font-medium',
        variantesBadge({ variante }),
        className
      )}
      {...resto}
    >
      {punto ? (
        <span aria-hidden className={cn('size-1.5 rounded-full', colorDelPunto[variante])} />
      ) : null}
      {icono ? <Icono icono={icono} tamano="xs" /> : null}
      {children}
    </BadgeBase>
  )
}
