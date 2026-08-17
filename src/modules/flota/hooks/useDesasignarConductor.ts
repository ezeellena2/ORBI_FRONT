import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorAsignacionConductor } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'
import type { MotivoCierreAsignacion } from '@/services/contracts/flota'

export interface DesasignarConductorVariables {
  asignacionId: string
  /** Codigo del catalogo `motivos_cierre_asignacion_flota`. Ausente -> el backend cierra con `otro`. */
  motivo?: MotivoCierreAsignacion
}

/**
 * Cierra la asignacion vehiculo<->conductor
 * (`DELETE .../vehiculos/{id}/asignaciones/conductor/{asignacionId}` -> 204), mismo permiso que
 * asignar (`flota.vehiculos.asignar-conductor`).
 *
 * El body es OPCIONAL y solo lleva `motivo`, que es un CODIGO DE CATALOGO, no texto libre.
 *
 * ⚠️ DE DONDE SALE EL `asignacionId`, que es la parte fragil: del lado del VEHICULO no hay ninguna
 * lectura que lo exponga — `GET /vehiculos/{id}/asignaciones` no esta implementado (B-19) y
 * `VehiculoDetalleDto.conductoresAsignados` viene vacio SIEMPRE. Los 2 origenes reales son la
 * respuesta del `POST` de esta sesion y `GET /conductores/{conductorId}/asignaciones`
 * (`useAsignacionesConductor`), que SI lo trae. Si no hay id, el boton va DESHABILITADO CON EL
 * MOTIVO VISIBLE — nunca ausente y nunca habilitado "a ver si anda".
 *
 * Desasignar dos veces devuelve 404 `flota.asignacion.no_existe`; una `asignacionId` de otro
 * vehiculo, 404 `flota.recurso.organizacion_invalida`.
 */
export function useDesasignarConductor(vehiculoFlotaId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, DesasignarConductorVariables>({
    mutationFn: async ({ asignacionId, motivo }) => {
      await vehiculosService.desasignarConductor(
        vehiculoFlotaId,
        asignacionId,
        motivo === undefined ? undefined : { motivo },
      )
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorAsignacionConductor()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
