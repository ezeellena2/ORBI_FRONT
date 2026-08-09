import type { LucideIcon } from 'lucide-react'
import { Input as InputBase } from '@/shared/ui/base/input'
import { Icono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'

/**
 * Familia B — `Input`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Lo que aporta la envoltura:
 *  - `iconoIzq` / `iconoDer` con el padding ya resuelto (el caso del buscador).
 *  - `mono`: patentes, VIN, IMEI, coordenadas, ids y códigos de error van en
 *    tipografía monoespaciada. NO es decorativo: en esos datos el usuario
 *    compara carácter por carácter, y la proporcional hace que `0/O` y `1/l` se
 *    confundan. Agrega además `tracking-wide`, porque el mono apretado empeora
 *    justo lo que se quiere resolver.
 *  - `invalido` como alias explícito de `aria-invalid`, para que el estado de
 *    error sea una prop y no un atributo que alguien se olvida.
 */

export interface InputProps extends Omit<React.ComponentProps<typeof InputBase>, 'size'> {
  iconoIzq?: LucideIcon
  iconoDer?: LucideIcon
  /** Marca el control como inválido (borde + `aria-invalid`). */
  invalido?: boolean
  /** Tipografía monoespaciada, para datos que se leen carácter por carácter. */
  mono?: boolean
}

export function Input({
  iconoIzq,
  iconoDer,
  invalido,
  mono = false,
  className,
  ...resto
}: InputProps) {
  const campo = (
    <InputBase
      aria-invalid={invalido || undefined}
      className={cn(
        'h-10 rounded-md border-borde bg-superficie-2 px-3 text-sm text-fg-primario',
        'placeholder:text-fg-terciario',
        'hover:border-borde-hover',
        'focus-visible:border-foco focus-visible:ring-3 focus-visible:ring-foco/35',
        'disabled:bg-superficie-1 disabled:text-fg-terciario',
        'aria-invalid:border-peligro aria-invalid:ring-peligro/20',
        mono ? 'font-mono tracking-wide' : '',
        iconoIzq ? 'pl-9' : '',
        iconoDer ? 'pr-9' : '',
        className
      )}
      {...resto}
    />
  )

  if (!iconoIzq && !iconoDer) return campo

  return (
    <div className="relative w-full">
      {iconoIzq ? (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-fg-terciario">
          <Icono icono={iconoIzq} tamano="md" />
        </span>
      ) : null}
      {campo}
      {iconoDer ? (
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-fg-terciario">
          <Icono icono={iconoDer} tamano="md" />
        </span>
      ) : null}
    </div>
  )
}
