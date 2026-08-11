import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'
import type { ActualizarDispositivoRequest, DispositivoDetalleDto } from '@/services/contracts/flota'

/**
 * Edicion de los datos OPERATIVOS del dispositivo (`PATCH`). El IMEI es read-only: es identidad del
 * hardware y vive en el canonico.
 *
 * `setQueryData` con la respuesta antes de invalidar: el `PATCH` devuelve el `DispositivoDetalleDto`
 * completo, asi que la pantalla puede mostrar el valor nuevo en el mismo frame en que cierra el
 * modal, sin esperar el refetch. La invalidacion por prefijo `['flota','dispositivos']` alcanza al
 * listado con cualquier filtro (el alias se ve ahi).
 *
 * Error que la pantalla ramifica por `code`: `flota.dispositivo.alias_duplicado` (409).
 */
export function useEditarDispositivo(dispositivoId: string) {
  const queryClient = useQueryClient()

  return useMutation<DispositivoDetalleDto, unknown, ActualizarDispositivoRequest>({
    mutationFn: async (data) => {
      const respuesta = await dispositivosService.actualizar(dispositivoId, data)
      return respuesta.data
    },
    onSuccess: (detalle) => {
      queryClient.setQueryData(flotaKeys.dispositivoDetalle(dispositivoId), detalle)
      void queryClient.invalidateQueries({ queryKey: flotaKeys.dispositivos() })
    },
  })
}
