import { ExternalLink } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Icono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'

/**
 * Familia A — `Enlace`. Origen: PROPIO (02-primitivas.md, mapa de cobertura):
 * shadcn/ui no trae un componente de enlace, es un `<a>` con estilos.
 *
 * Lo único no trivial es `externo`, y no es cosmético:
 *  - `rel="noopener noreferrer"` con `target="_blank"`. Sin `noopener`, la
 *    página destino puede manipular la nuestra por `window.opener`.
 *  - Un ícono visible Y un aviso para lector de pantalla. Si solo hay ícono,
 *    quien no ve la pantalla no se entera de que va a cambiar de pestaña.
 *
 * NO sabe de routing: recibe `href`. Si hace falta navegación de SPA, quien lo
 * compone le pasa `render`/`as` desde su capa — una primitiva de UI no lee la
 * URL ni conoce el router (R4).
 */

const variantesEnlace = cva(
  'rounded-sm underline-offset-4 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-foco/35',
  {
    variants: {
      variante: {
        normal: 'text-marca hover:text-marca-hover hover:underline',
        sutil: 'text-fg-secundario hover:text-fg-primario hover:underline',
      },
    },
    defaultVariants: { variante: 'normal' },
  }
)

export interface EnlaceProps
  extends React.ComponentProps<'a'>,
    VariantProps<typeof variantesEnlace> {
  href: string
  externo?: boolean
  /** Texto que anuncia el lector de pantalla para un enlace externo. */
  etiquetaExterno?: string
}

export function Enlace({
  variante = 'normal',
  externo = false,
  etiquetaExterno = '(se abre en una pestaña nueva)',
  className,
  children,
  ...resto
}: EnlaceProps) {
  return (
    <a
      className={cn(
        variantesEnlace({ variante }),
        externo ? 'inline-flex items-center gap-1' : '',
        className
      )}
      target={externo ? '_blank' : undefined}
      rel={externo ? 'noopener noreferrer' : undefined}
      {...resto}
    >
      {children}
      {externo ? (
        <>
          <Icono icono={ExternalLink} tamano="xs" />
          <span className="sr-only">{etiquetaExterno}</span>
        </>
      ) : null}
    </a>
  )
}
