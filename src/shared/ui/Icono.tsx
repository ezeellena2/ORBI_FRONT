import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

/**
 * Familia F — `Icono`. Origen: ENVOLVER (02-primitivas.md, mapa de cobertura).
 *
 * Hereda el color por `currentColor` y NUNCA lo fija. Por eso un ícono adentro
 * de un botón `peligro` se pinta solo, sin necesidad de una variante de ícono
 * por cada variante de botón.
 *
 * PENDIENTE (DA-FE-04 de 02-primitivas): librería de íconos, empaquetado vs.
 * inline y grilla de tamaños. Decide: PO / equipo de frontend.
 * Lo que esta implementación asume, y por qué:
 *  - `lucide-react`, que ya estaba en el `package.json` y es el default que los
 *    componentes copiados de shadcn/ui ya importan. Elegir otra librería obliga
 *    a editar cada componente copiado, en cada re-copia.
 *  - La grilla de tamaños de abajo es PROVISORIA: son los múltiplos de la escala
 *    de 4px que Tailwind ya genera (`size-3` … `size-6`).
 *
 * Desvío declarado del catálogo: el doc lista la prop `nombre`. Acá se recibe el
 * COMPONENTE (`icono`), no un string. Un `nombre: string` necesita un mapa
 * string→componente, y ese mapa o empaqueta las ~1500 de lucide o es un registro
 * curado que todavía nadie definió — es justamente lo que DA-FE-04 tiene que
 * decidir, así que no se inventa acá.
 */

export type TamanoIcono = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const tamanos: Record<TamanoIcono, string> = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
  xl: 'size-6',
}

export interface IconoProps extends React.SVGProps<SVGSVGElement> {
  /** El componente de ícono. Ej: `import { Truck } from 'lucide-react'`. */
  icono: LucideIcon
  tamano?: TamanoIcono
  /**
   * Texto para lector de pantalla. Si se omite, el ícono se marca
   * `aria-hidden`: es decorativo y el significado lo aporta el texto de al lado.
   */
  etiqueta?: string
}

export function Icono({ icono: Componente, tamano = 'md', etiqueta, className, ...resto }: IconoProps) {
  return (
    <Componente
      className={cn(tamanos[tamano], 'shrink-0', className)}
      aria-hidden={etiqueta ? undefined : true}
      aria-label={etiqueta}
      role={etiqueta ? 'img' : undefined}
      {...resto}
    />
  )
}
