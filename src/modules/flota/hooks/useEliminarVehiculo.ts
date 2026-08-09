import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'

/**
 * Baja LOGICA del vehiculo (`DELETE` -> 204). No existe hard-delete en v1: el vehiculo deja de
 * aparecer en listados y mapa, y sigue existiendo. El copy de la confirmacion NO dice "no se puede
 * deshacer" (correccion del mockup, ficha §11).
 *
 * Con dispositivo o conductor asignado el backend responde 409
 * `flota.vehiculo.baja_con_asignaciones_activas`.
 *
 * Invalida el prefijo `['flota','vehiculos']`, que alcanza al listado con cualquier filtro y al
 * detalle del vehiculo dado de baja.
 */
export function useEliminarVehiculo() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, string>({
    mutationFn: async (vehiculoFlotaId) => {
      await vehiculosService.eliminar(vehiculoFlotaId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flotaKeys.vehiculos() })
    },
  })
}
