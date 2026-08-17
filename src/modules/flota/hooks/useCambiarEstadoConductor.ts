import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'
import type { CambiarEstadoConductorRequest } from '@/services/contracts/flota'

/**
 * Transicion de estado OPERATIVO del conductor (`POST .../{id}/estado`, permiso
 * `flota.conductores.editar`).
 *
 * ⚠️ EL ENDPOINT DEVUELVE 204 SIN CUERPO, a diferencia del gemelo de stock del dispositivo (que
 * devuelve el detalle). Por eso este hook NO puede sembrar la cache con la respuesta: invalida el
 * prefijo del recurso y la pantalla vuelve a leer. Un `setQueryData` con `undefined` aca borraria el
 * detalle de la cache y dejaria la ficha en blanco.
 *
 * La maquina de estados la valida el BACKEND (`datos.md` §3.2), no este hook. La UI ofrece solo los
 * destinos que la matriz admite desde el estado actual, pero eso es ergonomia: quien decide es el
 * servidor.
 *  - 409 `flota.conductor.transicion_invalida` (`args {estadoActual, estadoDestino}`).
 *  - 409 `flota.conductor.documento_vencido` (`args {tipoDocumento}`) al pasar a `en_servicio` con
 *    documentacion obligatoria vencida o sin cargar. El modal muestra el motivo y NO cierra.
 *
 * ⚠️ `suspendido` NO TIENE VUELTA en v1 (B-22): el contrato no declara ninguna arista de salida. Un
 * selector que la ofrezca esta ofreciendo un 409.
 *
 * ⚠️ NO toca el flag `activo` (ortogonalidad DA-CD2-19): desactivar es `useBajaConductor`.
 *
 * ⚠️ `motivo` NO SE PERSISTE: no hay columna ni tabla de historial de estado. Viaja al evento
 * `flota.conductor-operativo-estado-cambiado.v1` y muere ahi. No prometer un historial de motivos.
 */
export function useCambiarEstadoConductor(conductorId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, CambiarEstadoConductorRequest>({
    mutationFn: async (data) => {
      await conductoresService.cambiarEstado(conductorId, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flotaKeys.conductores() })
    },
  })
}
