import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorAsignacion } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'
import type {
  AsignacionVehiculoDispositivoDto,
  AsignarDispositivoRequest,
} from '@/services/contracts/flota'

/**
 * Instala un GPS en un vehiculo (`POST .../asignaciones/dispositivo`), permiso
 * `flota.vehiculos.asignar-dispositivo`.
 *
 * ⚠️ NO ES UN CRUD DE UNA TABLA: el backend coordina con PlataformaCanonica ANTES de persistir
 * (D-S3-13), porque la correlacion dispositivo->vehiculo la posee el Canonico y es lo que hace que
 * Telemetria acepte las posiciones. Si esa coordinacion falla, la mutation falla y NO quedo nada
 * escrito. No hay estado intermedio que reconciliar.
 *
 * REASIGNAR NO ES UN ERROR: si el vehiculo ya tenia GPS, el backend cierra la asignacion anterior
 * (`motivo_cierre = reasignacion`) y devuelve el saliente a `en_stock`. Por eso la invalidacion no
 * puede ser puntual — ver `flotaKeysAfectadasPorAsignacion`, que explica las 4 (o 5) superficies que
 * se mueven de golpe.
 *
 * La respuesta trae el `asignacionId`, que es el UNICO camino al `DELETE` (D-S3-16): quien consuma
 * este hook tiene que guardarlo, no descartarlo.
 */
export function useAsignarDispositivo(vehiculoFlotaId: string) {
  const queryClient = useQueryClient()

  return useMutation<AsignacionVehiculoDispositivoDto, unknown, AsignarDispositivoRequest>({
    mutationFn: async (data) => {
      const respuesta = await vehiculosService.asignarDispositivo(vehiculoFlotaId, data)
      return respuesta.data
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorAsignacion()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
