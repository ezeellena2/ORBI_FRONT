import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorVinculoConductorDispositivo } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'
import type {
  AsignacionConductorDispositivoDto,
  AsignarDispositivoConductorRequest,
} from '@/services/contracts/flota'

/**
 * Abre el vinculo conductor<->dispositivo (`POST .../conductores/{id}/dispositivos`), permiso
 * `flota.conductores.asignar-dispositivo`.
 *
 * ⚠️ NO ES LO MISMO QUE INSTALAR EL GPS EN UN VEHICULO. Ese otro vinculo es 1:1, cuelga del vehiculo
 * y tiene su propio permiso (`flota.vehiculos.asignar-dispositivo`) — ver `useAsignarDispositivo`.
 * Este es N:N de ATRIBUCION: no mueve el estado de stock del equipo, no lo pone `instalado` y no
 * hace que Telemetria acepte posiciones. Un modal que los mezcle promete algo que no pasa.
 *
 * Tampoco coordina con PlataformaCanonica: es un hecho operativo propio de Flota.
 *
 * Invalida conductores + dispositivos: el vinculo se ve de los dos lados.
 */
export function useAsignarDispositivoAConductor(conductorId: string) {
  const queryClient = useQueryClient()

  return useMutation<
    AsignacionConductorDispositivoDto,
    unknown,
    AsignarDispositivoConductorRequest
  >({
    mutationFn: async (data) => {
      const respuesta = await conductoresService.asignarDispositivo(conductorId, data)
      return respuesta.data
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorVinculoConductorDispositivo()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
