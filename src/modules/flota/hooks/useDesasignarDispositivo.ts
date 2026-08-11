import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorAsignacion } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'
import type { DesasignarDispositivoRequest } from '@/services/contracts/flota'

/** Lo que el caller pasa al `mutate`: la asignacion a cerrar + el motivo opcional. */
export interface DesasignarDispositivoVariables {
  /**
   * ⚠️ Sale de la respuesta del `POST` de asignacion, que hoy es su UNICA fuente (D-S3-16):
   * `GET /vehiculos/{id}/asignaciones` no esta implementado y los items de
   * `historialAsignaciones` del detalle del dispositivo NO llevan el id.
   */
  asignacionId: string
  /** Codigo del catalogo `motivos_cierre_asignacion_flota`, no texto libre. Ausente -> `otro`. */
  motivo?: DesasignarDispositivoRequest['motivo']
}

/**
 * Desinstala el GPS del vehiculo: cierra la vigencia, devuelve el dispositivo a `en_stock` y CORTA
 * LA CORRELACION EN EL CANONICO. Si el corte falla, la operacion falla — dejarla a medias mantiene
 * posiciones atribuidas a un vehiculo en el que el aparato ya no esta.
 *
 * Desasignar una asignacion YA CERRADA devuelve 404 `flota.asignacion.no_existe`, no un 409: el
 * contrato no tiene un conflicto para "esto ya paso", y cerrar dos veces reescribiria historia.
 * Una `asignacionId` de otro vehiculo devuelve 404 `flota.recurso.organizacion_invalida`.
 *
 * Misma invalidacion que el alta (las 4 superficies), por la misma razon.
 */
export function useDesasignarDispositivo(vehiculoFlotaId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, DesasignarDispositivoVariables>({
    mutationFn: async ({ asignacionId, motivo }) => {
      await vehiculosService.desasignarDispositivo(
        vehiculoFlotaId,
        asignacionId,
        motivo === undefined ? undefined : { motivo },
      )
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorAsignacion()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
