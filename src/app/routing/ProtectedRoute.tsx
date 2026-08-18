import { Navigate, useLocation } from 'react-router-dom'
import { useSessionStore } from '@/stores/session-store'
import { authService } from '@/services/auth/auth-service'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useEffect, type PropsWithChildren } from 'react'

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
 *
 * ── POR QUE ES useQuery Y NO useMutation + useRef (regresion arreglada el 2026-08-17) ──────────
 * La version anterior disparaba una `useMutation` desde un `useEffect`, con un `useRef` como guard
 * de "ya lo intente". Con `StrictMode` (activo en `main.tsx`) eso se colgaba PARA SIEMPRE:
 *
 *   1. Primer montaje: el efecto corre, pone el ref en `true` y dispara el refresh.
 *   2. StrictMode desmonta y REMONTA el componente.
 *   3. En el remontaje, `useMutation` arranca con estado FRESCO (`isIdle`, `isError: false`).
 *   4. El efecto corre otra vez, pero EL REF SOBREVIVIO al remontaje → no vuelve a disparar.
 *   5. El 401 aterriza sobre la instancia DESCARTADA. La viva queda `isIdle` para siempre.
 *
 * Resultado medido: entrar sin sesion a cualquier `/app/*` —un bookmark, un link compartido, o un
 * F5 con la sesion vencida— dejaba una pantalla "Cargando..." infinita que NUNCA llegaba al login.
 *
 * `useQuery` no tiene ese problema: el estado vive en el cache de React Query, indexado por
 * `queryKey`, no en la instancia del componente. El remontaje de StrictMode reusa la MISMA consulta
 * en vuelo —una sola request— y el resultado sobrevive. No cambiar esto por una mutation sin
 * entender los 5 pasos de arriba.
 */
export function ProtectedRoute({ children }: PropsWithChildren) {
  const { t } = useTranslation()
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  const login = useSessionStore((s) => s.login)
  const location = useLocation()

  const recovery = useQuery({
    queryKey: ['sesion', 'recuperacion'],
    queryFn: async () => (await authService.refresh()).data,
    enabled: !isAuthenticated,
    // Un refresh que falla es una respuesta, no un error transitorio: reintentar solo demora el
    // redirect al login. Y sin `staleTime` infinito, cada montaje volveria a pedirlo.
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  })

  useEffect(function adoptarSesionRecuperada() {
    if (recovery.data) {
      login(recovery.data)
    }
  }, [recovery.data, login])

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
