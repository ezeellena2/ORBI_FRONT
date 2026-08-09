import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Compone clases de Tailwind resolviendo los conflictos a favor de la ultima.
 *
 * Por que `clsx` + `tailwind-merge` y no un `filter(Boolean).join(' ')`:
 * sin `twMerge`, pasarle `className="bg-superficie-2"` a un componente que ya
 * trae `bg-superficie-1` deja las DOS clases en el atributo y gana la que el
 * bundler haya puesto ultima en la hoja de estilos — o sea, el override
 * funciona o no segun el orden del build. Es el bug clasico de una capa de
 * primitivas de UI con `className` pasante, y es el motivo por el que todos los
 * componentes de shadcn/ui asumen esta implementacion de `cn`.
 *
 * Esta es la funcion a la que apunta `aliases.utils` en `components.json`, para
 * que el CLI nunca cree un `@/lib/utils` fuera del arbol de carpetas
 * (`03-estructura-y-convenciones.md` §2.3.2).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
