import type { LucideIcon } from 'lucide-react'
import {
  Avatar as AvatarBase,
  AvatarFallback,
  AvatarImage,
} from '@/shared/ui/base/avatar'
import { Icono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'
import { inicialesDe } from '@/shared/utils/iniciales'

/**
 * Familia F — `Avatar`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Gaps propios:
 *  - Las INICIALES derivadas del nombre. Es lo que evita que cada pantalla
 *    escriba su propio `split(' ').map(...)`, con un resultado distinto por
 *    módulo para la misma persona.
 *  - El indicador de estado (el puntito de la esquina), con su color semántico.
 *
 * Accesibilidad: el avatar es DECORATIVO por defecto (`aria-hidden`), porque el
 * nombre de la persona ya está escrito al lado en el 100% de los casos reales.
 * Si el avatar va solo, se pasa `soloAvatar` y entonces sí lleva nombre
 * accesible. Un avatar que anuncia el nombre estando al lado del nombre lo hace
 * leer dos veces.
 */

export type TamanoAvatar = 'sm' | 'md' | 'lg' | 'xl'
export type EstadoAvatar = 'en-linea' | 'inactivo' | 'alerta'

const tamanos: Record<TamanoAvatar, string> = {
  sm: 'size-6 text-[0.625rem]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
  xl: 'size-14 text-base',
}

const coloresEstado: Record<EstadoAvatar, string> = {
  'en-linea': 'bg-exito',
  inactivo: 'bg-fg-terciario',
  alerta: 'bg-peligro',
}

export interface AvatarProps extends Omit<React.ComponentProps<typeof AvatarBase>, 'size'> {
  /** Nombre completo. Se usa para las iniciales y para el nombre accesible. */
  nombre: string
  src?: string
  /** Ícono en lugar de iniciales (organizaciones, entidades sin nombre propio). */
  icono?: LucideIcon
  tamano?: TamanoAvatar
  estado?: EstadoAvatar
  /** El avatar va solo, sin el nombre escrito al lado. */
  soloAvatar?: boolean
}

export function Avatar({
  nombre,
  src,
  icono,
  tamano = 'md',
  estado,
  soloAvatar = false,
  className,
  ...resto
}: AvatarProps) {
  return (
    <span className="relative inline-flex">
      <AvatarBase
        aria-hidden={soloAvatar ? undefined : true}
        aria-label={soloAvatar ? nombre : undefined}
        role={soloAvatar ? 'img' : undefined}
        className={cn('rounded-full after:border-borde', tamanos[tamano], className)}
        {...resto}
      >
        {src ? <AvatarImage src={src} alt="" /> : null}
        <AvatarFallback className="bg-superficie-2 font-medium text-fg-secundario">
          {icono ? <Icono icono={icono} tamano="sm" /> : inicialesDe(nombre)}
        </AvatarFallback>
      </AvatarBase>

      {estado ? (
        <span
          aria-hidden
          className={cn(
            'absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-superficie-1',
            coloresEstado[estado]
          )}
        />
      ) : null}
    </span>
  )
}
