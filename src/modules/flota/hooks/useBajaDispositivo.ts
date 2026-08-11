import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'
import type { DispositivoDetalleDto } from '@/services/contracts/flota'

/**
 * Baja del dispositivo — `POST .../baja`, NO `DELETE` (el `DELETE` es hard-delete y no tiene
 * superficie en esta pantalla).
 *
 * Es una baja LOGICA Y COHERENTE: `activo = false` + `estado_stock = 'dado_de_baja'` en la misma
 * transaccion (DA-DL-10). Y es REVERSIBLE con `POST .../reactivar` (DA-DD-13), asi que el copy de
 * la confirmacion NO dice "no se puede deshacer".
 *
 * Con asignacion activa el backend BLOQUEA con 409 `flota.dispositivo.baja_con_asignacion_activa`:
 * primero hay que desasociar el dispositivo del vehiculo.
 *
 * A diferencia de la baja de vehiculo, este endpoint devuelve el detalle actualizado en vez de 204:
 * la pantalla NO navega a ningun lado, se queda mostrando el dispositivo dado de baja con su boton
 * "Reactivar". Por eso se escribe la cache con la respuesta.
 */
export function useBajaDispositivo(dispositivoId: string) {
  const queryClient = useQueryClient()

  return useMutation<DispositivoDetalleDto, unknown, void>({
    mutationFn: async () => {
      const respuesta = await dispositivosService.darDeBaja(dispositivoId)
      return respuesta.data
    },
    onSuccess: (detalle) => {
      queryClient.setQueryData(flotaKeys.dispositivoDetalle(dispositivoId), detalle)
      void queryClient.invalidateQueries({ queryKey: flotaKeys.dispositivos() })
    },
  })
}
