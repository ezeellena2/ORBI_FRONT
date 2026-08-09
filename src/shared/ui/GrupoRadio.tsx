import { useId } from 'react'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/base/radio-group'
import { cn } from '@/shared/utils/cn'

/**
 * Familia B — `Radio` / `GrupoRadio`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Base UI ya resuelve el patrón ARIA del grupo: un solo tab-stop, flechas para
 * moverse entre opciones, y la selección viajando con el foco. Reimplementarlo
 * a mano es el caso típico donde el teclado queda a medias.
 *
 * Gap propio: API por `opciones[]`, y la etiqueta cableada al control por `id`
 * para que el click en el texto también seleccione. Sin eso, el área clickeable
 * de un radio son 16 píxeles.
 */

export interface OpcionRadio {
  valor: string
  etiqueta: string
  descripcion?: string
  deshabilitada?: boolean
}

export interface GrupoRadioProps
  extends Omit<React.ComponentProps<typeof RadioGroup>, 'value' | 'onValueChange' | 'children'> {
  opciones: OpcionRadio[]
  valor?: string
  onCambio?: (valor: string) => void
  orientacion?: 'vertical' | 'horizontal'
}

export function GrupoRadio({
  opciones,
  valor,
  onCambio,
  orientacion = 'vertical',
  className,
  ...resto
}: GrupoRadioProps) {
  const base = useId()

  return (
    <RadioGroup
      value={valor}
      onValueChange={(v) => onCambio?.(String(v))}
      className={cn(orientacion === 'horizontal' ? 'flex flex-wrap gap-4' : 'grid gap-2', className)}
      {...resto}
    >
      {opciones.map((o) => {
        const id = `${base}-${o.valor}`
        return (
          <div key={o.valor} className="flex items-start gap-2">
            <RadioGroupItem
              id={id}
              value={o.valor}
              disabled={o.deshabilitada}
              className={cn(
                'mt-0.5 border-borde bg-superficie-2',
                'data-checked:border-marca data-checked:bg-marca',
                'focus-visible:border-foco focus-visible:ring-3 focus-visible:ring-foco/35'
              )}
            />
            <label htmlFor={id} className="cursor-pointer select-none">
              <span className="block text-sm text-fg-primario">{o.etiqueta}</span>
              {o.descripcion ? (
                <span className="block text-xs text-fg-secundario">{o.descripcion}</span>
              ) : null}
            </label>
          </div>
        )
      })}
    </RadioGroup>
  )
}
