import { Navigate, useLocation } from 'react-router-dom'
import { useSessionStore } from '@/stores/session-store'
import { authService } from '@/services/auth/auth-service'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, type PropsWithChildren } from 'react'

/**
 * Guard que protege rutas autenticadas.
 *
 * 1. Si ya esta autenticado → muestra el children
 * 2. Si no esta autenticado → intenta recuperar sesion via refresh cookie
 *    - Si recupera → muestra children (el store ya tiene sesion)
 *    - Si falla → redirige a /auth/login preservando la ruta original
 *
 * ── POR QUE EL REDIRECT ESPERA A QUE EL RECOVERY FALLE ────────────────────────────────────────
 * El access token vive SOLO en memoria, asi que en cada F5 —y en cada URL pegada o compartida— el
 * primer render llega con `isAuthenticated=false`. La version anterior devolvia `<Navigate>` en ese
 * primer render, porque `recovery.isPending` todavia era `false`: la mutation arranca en un
 * `useEffect`, que corre DESPUES del render. El refresh despues aterrizaba bien (200), pero para
 * entonces ya estabamos en `/auth/login` y `PublicOnlyRoute` rebotaba a `/app`.
 *
 * Resultado medido: `/app/flota/dispositivos/{id}` + F5 → `/app`. Toda ficha "se comparte por su
 * URL" era mentira, en TODAS las pantallas de la app.
 *
 * Ahora la decision se toma con un estado que el render SI ve: solo se redirige cuando el recovery
 * fallo de verdad (`recovery.isError`). Mientras no fallo, se muestra el cargando.
 */
export function ProtectedRoute({ children }: PropsWithChildren) {
  const { t } = useTranslation()
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  const login = useSessionStore((s) => s.login)
  const location = useLocation()
  const recoveryAttempted = useRef(false)

  const recovery = useMutation({
    mutationFn: () => authService.refresh(),
    onSuccess: (response) => {
      login(response.data)
    },
  })

  useEffect(function attemptSessionRecovery() {
    if (!isAuthenticated && !recoveryAttempted.current) {
      recoveryAttempted.current = true
      recovery.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recovery ref is stable; including the object would cause re-runs
  }, [isAuthenticated])

  // Ya autenticado (directo o por recovery)
  if (isAuthenticated) {
    return <>{children}</>
  }

  // Recovery fallo → redirigir a login, preservando la ruta pedida.
  // `from` lleva tambien search y hash: un deep link a un listado filtrado pierde el filtro si se
  // guarda solo `pathname`.
  if (recovery.isError) {
    return (
      <Navigate
        to="/auth/login"
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
        replace
      />
    )
  }

  // Recovery en curso, o todavia sin disparar (el efecto corre despues de este render). Las dos
  // situaciones son la misma para el usuario: la sesion todavia no se sabe.
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-bg-canvas)]">
      <p className="text-[var(--color-text-secondary)] motion-safe:animate-pulse">
        {t('common.loading')}
      </p>
    </div>
  )
}
