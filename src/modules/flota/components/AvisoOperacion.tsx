import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Icono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'

/**
 * Banner compacto de error DENTRO de un formulario o un modal.
 *
 * No es `EstadoError`: esa primitiva es un bloque centrado que ocupa la superficie entera, pensada
 * para "esta sección no cargó". Acá el formulario sigue cargado y usable, y el mensaje va arriba de
 * los campos sin empujarlos fuera de la vista.
 *
 * El copy entra YA RESUELTO desde `message_key` (nunca copy de negocio hardcodeado). `trazaId` se
 * muestra en mono y seleccionable: es el dato con el que soporte encuentra el request en los logs.
 */
export function AvisoOperacion({
  titulo,
  mensaje,
  trazaId,
  accion,
  className,
}: {
  /** Ya resuelto por i18n. */
  titulo: string
  mensaje?: string | null
  trazaId?: string | null
  /** Normalmente un botón de reintento. */
  accion?: ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-peligro/40 bg-peligro-fondo px-4 py-3',
        className,
      )}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-fg-primario">
        <Icono icono={AlertTriangle} tamano="sm" />
        {titulo}
      </p>
      {mensaje ? <p className="text-sm text-fg-secundario">{mensaje}</p> : null}
      {trazaId ? (
        <p className="font-mono text-xs tracking-wide text-fg-terciario select-all">{trazaId}</p>
      ) : null}
      {accion ? <div className="mt-1">{accion}</div> : null}
    </div>
  )
}
