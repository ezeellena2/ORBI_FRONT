import type { ReactElement } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/base/tooltip'

/**
 * Envuelve una acción deshabilitada para que el usuario pueda leer POR QUÉ está apagada.
 *
 * Un botón muerto sin explicación se reporta como bug. El contrato de permisos manda que los verbos
 * `editar`, `asignar-*`, `importar`… se muestren **deshabilitados + tooltip** cuando falta el
 * permiso (el `eliminar` es el único que se oculta).
 *
 * Detalle no obvio: un control deshabilitado tiene `pointer-events: none`, así que el tooltip NO se
 * dispara sobre él. Por eso el disparador es un `<span>` que lo envuelve, y el motivo se repite en
 * un `sr-only` porque un tooltip sobre un elemento deshabilitado no se le anuncia a un lector de
 * pantalla. Es el mismo patrón que ya usa `MenuAcciones`.
 */
export function AccionConMotivo({
  motivo,
  children,
}: {
  /** Ya resuelto por i18n. `undefined` = la acción está habilitada y no se envuelve nada. */
  motivo?: string
  children: ReactElement
}) {
  if (!motivo) return children

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-block" />}>
        {children}
        <span className="sr-only">{motivo}</span>
      </TooltipTrigger>
      <TooltipContent className="bg-superficie-3 text-fg-primario shadow-lg">
        {motivo}
      </TooltipContent>
    </Tooltip>
  )
}
