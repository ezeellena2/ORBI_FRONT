import { useId } from 'react'
import { Switch } from '@/shared/ui/base/switch'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/utils/cn'

/**
 * Familia B — `Toggle`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Gap propio: el estado `cargando` MIENTRAS PERSISTE.
 * Los toggles suelen guardar al instante. Sin un estado intermedio el usuario
 * lo mueve dos veces y se mandan dos escrituras contradictorias — y la que gana
 * depende de cuál llegue última al servidor, no de lo que el usuario quiso.
 * Por eso `cargando` bloquea el control, no solo lo decora.
 */

export interface ToggleProps
  extends Omit<React.ComponentProps<typeof Switch>, 'checked' | 'onCheckedChange' | 'size'> {
  /** Texto visible al lado del control. Ya resuelto por i18n. */
  etiqueta?: string
  descripcion?: string
  activo?: boolean
  onCambio?: (activo: boolean) => void
  /** Persistiendo. Bloquea el control y muestra progreso. */
  cargando?: boolean
  deshabilitado?: boolean
}

export function Toggle({
  etiqueta,
  descripcion,
  activo,
  onCambio,
  cargando = false,
  deshabilitado = false,
  className,
  id,
  ...resto
}: ToggleProps) {
  const generado = useId()
  const idControl = id ?? `toggle-${generado}`
  const idDescripcion = descripcion ? `${idControl}-desc` : undefined

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="relative flex items-center">
        <Switch
          id={idControl}
          checked={activo}
          onCheckedChange={(v) => onCambio?.(Boolean(v))}
          disabled={deshabilitado || cargando}
          aria-describedby={idDescripcion}
          aria-busy={cargando || undefined}
          className={cn(
            'h-5 w-9 border-borde',
            'data-checked:bg-marca data-unchecked:bg-superficie-3',
            'focus-visible:border-foco focus-visible:ring-3 focus-visible:ring-foco/35',
            cargando ? 'opacity-60' : ''
          )}
          {...resto}
        />
        {cargando ? (
          <span className="pointer-events-none absolute -right-6">
            <Spinner tamano="sm" />
          </span>
        ) : null}
      </div>

      {etiqueta || descripcion ? (
        <label htmlFor={idControl} className="cursor-pointer select-none">
          {etiqueta ? (
            <span className="block text-sm text-fg-primario">{etiqueta}</span>
          ) : null}
          {descripcion ? (
            <span id={idDescripcion} className="block text-xs text-fg-secundario">
              {descripcion}
            </span>
          ) : null}
        </label>
      ) : null}
    </div>
  )
}
