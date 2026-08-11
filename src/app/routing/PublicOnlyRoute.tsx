import { Navigate, useLocation } from 'react-router-dom'
import { useSessionStore } from '@/stores/session-store'
import type { PropsWithChildren } from 'react'

/**
 * Guard que impide acceder a rutas publicas (login, registro) si ya esta autenticado.
 *
 * ── POR QUE LEE `state.from` Y NO MANDA SIEMPRE A `/app` ──────────────────────────────────────
 * `ProtectedRoute` guarda la ruta pedida en `state.from` cuando el recovery de sesion falla, y
 * `useLogin` la respeta al loguearse. Pero esta guard mandaba a `/app` HARDCODEADO, asi que en la
 * carrera "el refresh aterriza cuando el usuario ya rebotó a login" el destino original se perdia
 * en silencio: el usuario pedia una ficha, terminaba en el Dashboard y nadie le decia por que.
 *
 * Es la MISMA lectura que hace `useLogin` (`state.from ?? '/app'`), a proposito: dos destinos
 * distintos para la misma intencion es como se produjo el bug.
 */
export function PublicOnlyRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (isAuthenticated) {
    const destino = (location.state as { from?: string } | null)?.from ?? '/app'
    // Solo rutas internas: un `from` que empiece con `//` o con esquema seria un open redirect.
    const destinoSeguro = destino.startsWith('/') && !destino.startsWith('//') ? destino : '/app'
    return <Navigate to={destinoSeguro} replace />
  }

  return <>{children}</>
}
