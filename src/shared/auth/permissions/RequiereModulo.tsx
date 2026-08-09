import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSessionStore } from '@/stores/session-store'

/**
 * Gate de MODULO ACTIVO. Envuelve el modulo entero y dispara una sola vez.
 *
 * Aca SI hay redirect, y no contradice a `RequierePermiso`: no es "no tenes permiso", es "tu
 * organizacion no contrato este modulo". El sidebar ya no renderiza los links cuando el modulo no
 * esta activo, asi que esta guarda cubre navegacion directa por URL o una desactivacion con la
 * sesion abierta (`frontend.md` §3.3).
 *
 * Lee `organizacionActiva.modulos` del Session Snapshot. El backend valida igual con
 * `[RequiereModulo("flota")]` y responde 403 `flota.modulo.no_activo`: esto solo evita mostrar una
 * pantalla que va a fallar entera.
 */
export function RequiereModulo({
  modulo,
  children,
}: {
  modulo: string
  children: ReactNode
}) {
  const modulos = useSessionStore((s) => s.organizacionActiva?.modulos ?? [])

  if (!modulos.includes(modulo)) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
