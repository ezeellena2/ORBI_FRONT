import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'
import type { CrearVehiculoRequest, VehiculoDetalleDto } from '@/services/contracts/flota'

/**
 * Alta de vehiculo — el `POST` del paso 1 del wizard de onboarding.
 *
 * Devuelve el `VehiculoDetalleDto` creado: el wizard necesita el `vehiculoFlotaId` para seguir a
 * los pasos 2 y 3, que son opcionales. El vehiculo ya quedo creado y consultable aunque el usuario
 * abandone el wizard ahi mismo (DA-ON-01: NO se persiste al final).
 *
 * Errores que la pantalla ramifica por `code` (nunca por status a secas):
 * `flota.vehiculo.patente_duplicada` (409) -> inline en el campo Patente;
 * `flota.vehiculo.canonico_no_creable` (500) -> recuperable con reintento, y sin fila fantasma.
 */
export function useCrearVehiculo() {
  const queryClient = useQueryClient()

  return useMutation<VehiculoDetalleDto, unknown, CrearVehiculoRequest>({
    mutationFn: async (data) => {
      const respuesta = await vehiculosService.crear(data)
      return respuesta.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flotaKeys.vehiculos() })
    },
  })
}
