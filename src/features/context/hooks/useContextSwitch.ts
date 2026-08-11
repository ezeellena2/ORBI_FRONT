import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth/auth-service'
import { useSessionStore } from '@/stores/session-store'
import type { CambiarContextoRequest } from '@/services/contracts/auth'

/**
 * Hook que encapsula el cambio de contexto (organizacion activa):
 * 1. Llama a authService.cambiarContexto()
 * 2. En exito: tira el cache de la org anterior, rehidrata session store y navega a /app
 *
 * El cambio de contexto emite un JWT nuevo con la org destino.
 *
 * El `queryClient.clear()` NO es opcional y va ANTES de `updateContext`: las query
 * keys de los modulos (`flotaKeys.vehiculos()`, `flotaKeys.dispositivos()`, ...) no
 * llevan la org en la key, porque el tenant viaja en el JWT y no en la URL. Sin
 * limpiar, el cache de la org anterior queda indexado bajo la misma key y React
 * Query se lo sirve a la org nueva como dato fresco. Es la misma limpieza que hace
 * `useLogout`, por el mismo motivo.
 *
 * `clear()` y no `invalidateQueries()`: invalidar marca stale pero CONSERVA el dato,
 * asi que la pantalla igual pinta los vehiculos de la org anterior mientras revalida.
 */
export function useContextSwitch() {
  const updateContext = useSessionStore((s) => s.updateContext)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CambiarContextoRequest) => authService.cambiarContexto(data),
    onSuccess: (response) => {
      queryClient.clear()
      updateContext(response.data)
      navigate('/app', { replace: true })
    },
  })
}
