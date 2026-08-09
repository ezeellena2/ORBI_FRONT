import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { Icono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'

/**
 * Familia D — `EstadoError`. Origen: PROPIO (02-primitivas.md).
 *
 * Dos variantes, y la diferencia es operativa, no visual:
 *  - `recuperable`: la acción falló pero el usuario puede reintentar sin perder
 *    contexto. Muestra el botón de reintento.
 *  - `bloqueante`: la superficie entera no tiene fuente. No hay nada que
 *    reintentar desde acá; se muestra el motivo y el `trace_id`.
 *
 * `trazaId` se muestra en mono y se puede seleccionar a propósito: es el dato
 * con el que soporte encuentra el request en los logs. Un error sin traza
 * obliga a reproducirlo para investigarlo.
 *
 * El copy entra YA RESUELTO desde `message_key` (R5). Esta primitiva no traduce
 * ni conoce el catálogo de errores del backend.
 */

export type VarianteEstadoError = 'recuperable' | 'bloqueante'

export interface EstadoErrorProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  variante?: VarianteEstadoError
  /** Ya resuelto por i18n. */
  titulo: string
  mensaje?: string
  /** `trace_id` del ProblemDetails, para que soporte pueda encontrar el request. */
  trazaId?: string
  onReintentar?: () => void
  /** Texto del botón de reintento. Ya resuelto por i18n. */
  textoReintentar?: string
}

export function EstadoError({
  variante = 'recuperable',
  titulo,
  mensaje,
  trazaId,
  onReintentar,
  textoReintentar = 'Reintentar',
  className,
  ...resto
}: EstadoErrorProps) {
  return (
    <div
      role="alert"
      data-variante={variante}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-peligro/40',
        'bg-peligro-fondo px-6 py-10 text-center',
        className
      )}
      {...resto}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-peligro-fondo text-peligro">
        <Icono icono={AlertTriangle} tamano="lg" />
      </span>
      <p className="text-lg font-semibold tracking-snug text-fg-primario">{titulo}</p>
      {mensaje ? <p className="max-w-md text-sm text-fg-secundario">{mensaje}</p> : null}
      {trazaId ? (
        <p className="font-mono text-xs tracking-wide text-fg-terciario select-all">{trazaId}</p>
      ) : null}
      {variante === 'recuperable' && onReintentar ? (
        <Boton variante="secundaria" tamano="sm" iconoIzq={RefreshCw} onClick={onReintentar}>
          {textoReintentar}
        </Boton>
      ) : null}
    </div>
  )
}
