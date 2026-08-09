import { useState } from 'react'
import { Textarea } from '@/shared/ui/base/textarea'
import { cn } from '@/shared/utils/cn'

/**
 * Familia B — `AreaTexto`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Gap propio: `maxLargo` + contador VISIBLE. El `maxlength` nativo corta el
 * tipeo sin decir nada; el contador es lo que convierte un límite silencioso en
 * información. Al llegar al límite, el contador pasa a `--s-advertencia` y se
 * anuncia por `aria-live="polite"` — sin eso, quien usa lector de pantalla se
 * entera de que no puede escribir más recién cuando el texto deja de aparecer.
 */

export interface AreaTextoProps extends React.ComponentProps<typeof Textarea> {
  filas?: number
  /** Máximo de caracteres. Aplica `maxLength` nativo. */
  maxLargo?: number
  /** Muestra el contador `n/max`. Requiere `maxLargo`. */
  contador?: boolean
  invalido?: boolean
}

export function AreaTexto({
  filas = 4,
  maxLargo,
  contador = false,
  invalido,
  className,
  value,
  defaultValue,
  onChange,
  ...resto
}: AreaTextoProps) {
  const [largoInterno, setLargoInterno] = useState(String(defaultValue ?? '').length)
  const largo = value !== undefined ? String(value).length : largoInterno
  const enElLimite = maxLargo !== undefined && largo >= maxLargo

  return (
    <div className="flex w-full flex-col gap-1">
      <Textarea
        rows={filas}
        maxLength={maxLargo}
        value={value}
        defaultValue={defaultValue}
        aria-invalid={invalido || undefined}
        onChange={(evento) => {
          setLargoInterno(evento.target.value.length)
          onChange?.(evento)
        }}
        className={cn(
          'min-h-24 rounded-md border-borde bg-superficie-2 px-3 py-2 text-sm text-fg-primario',
          'placeholder:text-fg-terciario',
          'hover:border-borde-hover',
          'focus-visible:border-foco focus-visible:ring-3 focus-visible:ring-foco/35',
          'disabled:bg-superficie-1 disabled:text-fg-terciario',
          'aria-invalid:border-peligro aria-invalid:ring-peligro/20',
          className
        )}
        {...resto}
      />
      {contador && maxLargo !== undefined ? (
        <span
          aria-live="polite"
          className={cn(
            'self-end font-mono text-xs',
            enElLimite ? 'text-advertencia' : 'text-fg-terciario'
          )}
        >
          {largo}/{maxLargo}
        </span>
      ) : null}
    </div>
  )
}
