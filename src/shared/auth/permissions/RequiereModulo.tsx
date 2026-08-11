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
  // El `?? []` va AFUERA del selector, igual que en `RequierePermiso` y `usePermisos`. Zustand 5
  // corre el selector dentro de `useSyncExternalStore`: con el default adentro, cada lectura
  // construye un array NUEVO, React ve un snapshot distinto por render y entra en "Maximum update
  // depth". Se dispara solo sin organizacion activa — que es justo la ruta degradada, la que menos
  // se prueba y la unica en la que este guard importa.
  const modulosDeLaOrg = useSessionStore((s) => s.organizacionActiva?.modulos)
  const modulos = modulosDeLaOrg ?? []

  if (!modulos.includes(modulo)) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
