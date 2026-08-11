import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'
import type { CambiarEstadoStockRequest, DispositivoDetalleDto } from '@/services/contracts/flota'

/**
 * Transicion de estado de STOCK del dispositivo (`POST .../estado-stock`).
 *
 * La maquina de estados la valida el BACKEND, no este hook: `datos.md` §3.3 declara
 * `en_stock -> instalado` (solo via asignacion), `instalado`/`en_stock` -> `en_reparacion` ->
 * `en_stock`, y cualquiera -> `dado_de_baja` (terminal). Una transicion invalida vuelve como
 * 409 `flota.dispositivo.transicion_stock_invalida`, que el modal muestra en vez de cerrar.
 *
 * La UI ofrece solo los destinos que la maquina admite desde el estado actual, pero eso es
 * ergonomia: quien decide sigue siendo el servidor.
 */
export function useCambiarEstadoStockDispositivo(dispositivoId: string) {
  const queryClient = useQueryClient()

  return useMutation<DispositivoDetalleDto, unknown, CambiarEstadoStockRequest>({
    mutationFn: async (data) => {
      const respuesta = await dispositivosService.cambiarEstadoStock(dispositivoId, data)
      return respuesta.data
    },
    onSuccess: (detalle) => {
      queryClient.setQueryData(flotaKeys.dispositivoDetalle(dispositivoId), detalle)
      void queryClient.invalidateQueries({ queryKey: flotaKeys.dispositivos() })
    },
  })
}
