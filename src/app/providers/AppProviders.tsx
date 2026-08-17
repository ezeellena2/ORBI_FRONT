import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type PropsWithChildren } from 'react'
import { useThemeSync } from '@/shared/hooks/useThemeSync'
import { usePurgarCacheAlCambiarDeSesion } from '@/shared/hooks/usePurgarCacheAlCambiarDeSesion'

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

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
