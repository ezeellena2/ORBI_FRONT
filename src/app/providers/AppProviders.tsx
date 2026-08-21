import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type PropsWithChildren } from 'react'
import { useThemeSync } from '@/shared/hooks/useThemeSync'
import { usePurgarCacheAlCambiarDeSesion } from '@/shared/hooks/usePurgarCacheAlCambiarDeSesion'
import { ContenedorToast } from '@/shared/ui/Toast'

export function AppProviders({ children }: PropsWithChildren) {
  useThemeSync()

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  )

  // Aisla la cache entre sesiones: sin esto, cambiar de organizacion servia los datos de la
  // anterior durante el `staleTime`, porque ninguna query key lleva el tenant.
  usePurgarCacheAlCambiarDeSesion(queryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/*
        ── EL CONTENEDOR DE TOASTS VA ACÁ, NO EN `AppShell` ──────────────────────────────────────
        Hasta ahora **no estaba montado en ningún lado**: `ContenedorToast` solo se referenciaba
        desde su propia story, así que cualquier `toast.exito(...)` de la app no renderizaba nada.
        No había emisores todavía, así que no se perdió ningún mensaje — pero la mitad efímera de
        la regla de feedback (`04-patrones-de-pantalla.md` §4) era inejecutable.

        Va en los providers y no en el shell autenticado porque las pantallas de `/auth/*` también
        producen resultados de operación (registro, invitación, recuperar contraseña). Montado en
        `AppShell` esos toasts caerían al vacío exactamente igual que antes, y el bug volvería
        disfrazado de "solo pasa en login".
      */}
      <ContenedorToast />
    </QueryClientProvider>
  )
}
