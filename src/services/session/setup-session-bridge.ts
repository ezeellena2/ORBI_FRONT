import { configureHttpSessionBridge } from './http-session-bridge'
import { useSessionStore } from '@/stores/session-store'
import { httpClient } from '@/services/http/http-client'
import type { AuthResponse } from '@/services/contracts/auth'

/**
 * Conecta el bridge de sesion al store de Zustand.
 * Debe llamarse UNA VEZ al arrancar la app (en main.tsx o AppProviders).
 *
 * Esto permite que el HTTP client (axios interceptor) lea el token
 * del store sin acoplarse directamente a Zustand.
 */
export function setupSessionBridge() {
  configureHttpSessionBridge({
    // El interceptor de axios llama esto antes de cada request
    getAccessToken: () => useSessionStore.getState().accessToken,

    // El interceptor de 401 llama esto para intentar UN refresh. NO decide el logout: si falla
    // devuelve null y el interceptor arbitra (reintento por carrera multi-pestaña y, solo si
    // persiste, clearSession). Asi no deslogueamos el store en el medio de la carrera —lo que
    // patearia a /login antes de que el reintento recupere la sesion—.
    refreshSession: async () => {
      try {
        const response = await httpClient.post<AuthResponse>('/api/auth/refresh', {})
        const data = response.data
        useSessionStore.getState().updateContext(data)
        return data.accessToken
      } catch {
        return null
      }
    },

    // Si el refresh falla, el interceptor llama esto
    clearSession: () => {
      useSessionStore.getState().logout()
    },
  })
}
