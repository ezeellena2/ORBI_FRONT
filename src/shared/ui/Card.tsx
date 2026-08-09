import { cva, type VariantProps } from 'class-variance-authority'
import {
  Card as CardBase,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/base/card'
import { cn } from '@/shared/utils/cn'

/**
 * Familia E — `Card`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Gap propio: las variantes `interactiva`, `seleccionada` y `glow`, que shadcn
 * no tiene y que en ORBI significan cosas distintas:
 *  - `interactiva`: la card ES el control (una tarjeta de vehículo clickeable).
 *    Por eso además de hover recibe `tabIndex` y `role="button"`: si se puede
 *    clickear, se tiene que poder tabular.
 *  - `seleccionada`: estado, no hover. Borde de marca + fondo tenue.
 *  - `glow`: el resplandor de marca. Es la firma visual de "esto está vivo"
 *    (un dispositivo transmitiendo), y sale de `--s-sombra-marca`, sin offset.
 *
 * `Card` NO decide su ancho ni su margen externo (R9): eso lo decide quien la
 * compone. Un componente con margen propio no se puede reusar en otro layout
 * sin pelearse con él.
 */

const variantesCard = cva('border transition-colors duration-150 ease-out', {
  variants: {
    variante: {
      plana: 'border-borde',
      interactiva:
        'cursor-pointer border-borde hover:border-borde-hover hover:bg-superficie-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-foco/35',
      seleccionada: 'border-marca bg-marca-tenue',
      glow: 'border-marca/40 shadow-marca',
    },
  },
  defaultVariants: { variante: 'plana' },
})

export interface CardProps
  extends React.ComponentProps<typeof CardBase>,
    VariantProps<typeof variantesCard> {
  /** Título de la card. Ya resuelto por i18n. */
  titulo?: string
  /** Acciones del encabezado (un `MenuAcciones`, un `Boton`…). */
  acciones?: React.ReactNode
}

export function Card({
  variante = 'plana',
  titulo,
  acciones,
  className,
  children,
  ...resto
}: CardProps) {
  const esInteractiva = variante === 'interactiva'

  return (
    <CardBase
      role={esInteractiva ? 'button' : undefined}
      tabIndex={esInteractiva ? 0 : undefined}
      data-seleccionada={variante === 'seleccionada' || undefined}
      className={cn(
        'bg-superficie-1 text-fg-primario ring-0',
        variantesCard({ variante }),
        className
      )}
      {...resto}
    >
      {titulo || acciones ? (
        <CardHeader>
          {titulo ? (
            <CardTitle className="text-base font-semibold tracking-snug text-fg-primario">
              {titulo}
            </CardTitle>
          ) : null}
          {acciones ? <CardAction>{acciones}</CardAction> : null}
        </CardHeader>
      ) : null}
      <CardContent className="text-sm text-fg-secundario">{children}</CardContent>
    </CardBase>
  )
}
