import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { suscribirPurgaDeCachePorSesion } from '@/services/session/purga-de-cache-por-sesion'

/**
 * Monta la purga de cache entre sesiones. Se llama UNA VEZ, en `AppProviders`.
 *
 * El porque —la fuga de datos entre organizaciones que cierra, y por que la suscripcion corre
 * dentro del `set` de zustand y no en un efecto— vive en
 * `services/session/purga-de-cache-por-sesion.ts`. Este hook solo lo engancha al ciclo de vida.
 *
 * ⚠️ Recibe el `QueryClient` por parametro en vez de usar `useQueryClient()`: quien lo llama es el
 * componente que CREA el client y monta el provider, asi que arriba suyo todavia no hay contexto
 * del que leerlo.
 */
export function usePurgarCacheAlCambiarDeSesion(queryClient: QueryClient) {
  useEffect(
    function montarPurgaDeCachePorSesion() {
      return suscribirPurgaDeCachePorSesion(queryClient)
    },
    [queryClient]
  )
}
