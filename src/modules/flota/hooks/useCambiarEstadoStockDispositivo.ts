import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'
import type { CambiarEstadoStockRequest } from '@/services/contracts/flota'

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
 *
 * ⚠️ **RESPONDE 204 SIN CUERPO** (`DispositivosController.CambiarEstadoStock` → `NoContent()`, y su
 * docstring lo dice literal: *"204 sin cuerpo, a proposito: es un cambio de estado, no una
 * lectura"*). Este hook tipaba la respuesta como `DispositivoDetalleDto` y sembraba `respuesta.data`
 * en la cache del detalle: con axios eso es el **string vacio**, o sea que la ficha se quedaba
 * renderizando un DTO inexistente hasta que aterrizaba el refetch de la invalidacion.
 */
export function useCambiarEstadoStockDispositivo(dispositivoId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, CambiarEstadoStockRequest>({
    mutationFn: async (data) => {
      await dispositivosService.cambiarEstadoStock(dispositivoId, data)
    },
    onSuccess: () => {
      // 204 sin cuerpo: solo se invalida el prefijo. `['flota','dispositivos']` alcanza al listado,
      // al detalle y al historial de stock, que es justo lo que esta transicion acaba de mover.
      void queryClient.invalidateQueries({ queryKey: flotaKeys.dispositivos() })
    },
  })
}
