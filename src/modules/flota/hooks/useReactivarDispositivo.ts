import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'
import type { DispositivoDetalleDto } from '@/services/contracts/flota'

/**
 * Reactivacion del dispositivo dado de baja (`POST .../reactivar`, permiso
 * `flota.dispositivos.editar`).
 *
 * Es la contracara de `useBajaDispositivo` y la razon por la que la baja no se anuncia como
 * irreversible. Lo que NO hace es devolver el dispositivo a `instalado`: `dado_de_baja` es terminal
 * hacia adelante en la maquina de stock, y volver a un vehiculo requiere una asignacion nueva.
 */
export function useReactivarDispositivo(dispositivoId: string) {
  const queryClient = useQueryClient()

  return useMutation<DispositivoDetalleDto, unknown, void>({
    mutationFn: async () => {
      const respuesta = await dispositivosService.reactivar(dispositivoId)
      return respuesta.data
    },
    onSuccess: (detalle) => {
      queryClient.setQueryData(flotaKeys.dispositivoDetalle(dispositivoId), detalle)
      void queryClient.invalidateQueries({ queryKey: flotaKeys.dispositivos() })
    },
  })
}
