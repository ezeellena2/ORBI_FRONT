import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorVinculoConductorDispositivo } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'
import type { MotivoCierreAsignacion } from '@/services/contracts/flota'

export interface CerrarVinculoDispositivoConductorVariables {
  asignacionId: string
  /** Codigo del catalogo `motivos_cierre_asignacion_flota`. Ausente -> el backend cierra con `otro`. */
  motivo?: MotivoCierreAsignacion
}

/**
 * Cierra el vinculo conductor<->dispositivo (`DELETE .../conductores/{id}/dispositivos/{asignId}`
 * -> 204), mismo permiso que abrirlo.
 *
 * El body es OPCIONAL: se manda solo cuando hay motivo elegido. `motivo` es un CODIGO DE CATALOGO,
 * no texto libre — el dominio rechaza cualquier valor fuera de el.
 *
 * ⚠️ El `asignacionId` sale del `GET .../dispositivos` o de la respuesta del `POST`. A diferencia
 * del vinculo vehiculo<->dispositivo, aca SI hay un `GET` que lo expone: el boton "Desvincular"
 * nunca queda sin id.
 *
 * Cerrar dos veces devuelve 404 `flota.asignacion.no_existe` (el contrato no tiene un 409 para "esto
 * ya paso"): no es un fallo de la pantalla, es que otro ya lo cerro.
 */
export function useCerrarVinculoDispositivoConductor(conductorId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, CerrarVinculoDispositivoConductorVariables>({
    mutationFn: async ({ asignacionId, motivo }) => {
      await conductoresService.cerrarVinculoDispositivo(
        conductorId,
        asignacionId,
        motivo === undefined ? undefined : { motivo },
      )
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorVinculoConductorDispositivo()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
