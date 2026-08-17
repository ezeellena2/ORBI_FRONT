import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorAsignacionConductor } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'
import type {
  AsignacionVehiculoConductorDto,
  AsignarConductorRequest,
} from '@/services/contracts/flota'

/**
 * Asigna un conductor a un vehiculo (`POST .../vehiculos/{id}/asignaciones/conductor`), permiso
 * **`flota.vehiculos.asignar-conductor`** — del grupo VEHICULOS, no del de conductores.
 *
 * ⚠️ A DIFERENCIA de `useAsignarDispositivo`, NO HAY COORDINACION CANONICA: el conductor de un
 * vehiculo es un hecho operativo propio de Flota. Por eso este hook no tiene el tratamiento de error
 * `coordinacion`, y por eso hay una consecuencia que la UI no debe tapar (B-20, abierta): el
 * Canonico sigue diciendo "este vehiculo no tiene principal" y **Notificaciones no le avisa al
 * conductor**. No prometer un aviso que nadie manda.
 *
 * ⚠️ EL PRINCIPAL NO SE REASIGNA SOLO. "Cambiar conductor" es DESASIGNAR + ASIGNAR, **2 requests sin
 * atomicidad**: si el POST falla despues de un DELETE exitoso, el vehiculo queda SIN conductor. La
 * pantalla no puede tragarse ese fallo — muestra el error y ofrece reintentar la asignacion.
 *
 * ⚠️ ASIGNAR NO PASA AL CONDUCTOR A `en_servicio`: eso es una transicion explicita
 * (`useCambiarEstadoConductor`).
 *
 * Errores que la UI distingue POR `code`, los 3 en 409 — ver `vocabulario-conductor-asignacion.ts`:
 *  - `flota.conductor.suspendido_no_asignable`
 *  - `flota.conductor.licencia_vencida` (solo `vencido` bloquea; `sin_cargar` NO)
 *  - `flota.vehiculo.ya_tiene_principal`
 *
 * La respuesta trae el `asignacionId`, que es lo que el `DELETE` pide en la URL: quien consuma este
 * hook tiene que guardarlo, no descartarlo (del lado del vehiculo no hay `GET` que lo exponga).
 */
export function useAsignarConductor(vehiculoFlotaId: string) {
  const queryClient = useQueryClient()

  return useMutation<AsignacionVehiculoConductorDto, unknown, AsignarConductorRequest>({
    mutationFn: async (data) => {
      const respuesta = await vehiculosService.asignarConductor(vehiculoFlotaId, data)
      return respuesta.data
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorAsignacionConductor()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
