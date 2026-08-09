import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'
import type { ActualizarVehiculoRequest, VehiculoDetalleDto } from '@/services/contracts/flota'

/**
 * Edición de los datos OPERATIVOS del vehículo (`PATCH`, nunca `PUT` — C-11).
 *
 * Lo pide `f-06` paso 1 y el cimiento del slice no lo construyó: el endpoint ya estaba cubierto por
 * `vehiculosService.actualizar`, faltaba el hook.
 *
 * `setQueryData` con la respuesta antes de invalidar: el `PATCH` devuelve el `VehiculoDetalleDto`
 * completo releído por la misma vía que el `GET`, así que la pantalla puede mostrar el valor nuevo
 * en el mismo frame en que se cierra el modal, sin esperar el refetch.
 *
 * La invalidación por prefijo `['flota','vehiculos']` alcanza al listado con cualquier filtro (la
 * patente y el alias se ven ahí) y refresca el detalle contra el servidor.
 *
 * Errores que la pantalla ramifica por `code`: `flota.vehiculo.transicion_invalida` (409) y
 * `flota.vehiculo.no_existe` (404, que también es cross-tenant).
 */
export function useEditarVehiculo(vehiculoFlotaId: string) {
  const queryClient = useQueryClient()

  return useMutation<VehiculoDetalleDto, unknown, ActualizarVehiculoRequest>({
    mutationFn: async (data) => {
      const respuesta = await vehiculosService.actualizar(vehiculoFlotaId, data)
      return respuesta.data
    },
    onSuccess: (detalle) => {
      queryClient.setQueryData(flotaKeys.vehiculoDetalle(vehiculoFlotaId), detalle)
      void queryClient.invalidateQueries({ queryKey: flotaKeys.vehiculos() })
    },
  })
}
