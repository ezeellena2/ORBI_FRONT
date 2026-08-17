import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'

/**
 * Reactivacion del conductor (`POST .../{id}/reactivar` -> 204).
 *
 * ⚠️ PIDE `flota.conductores.editar`, NO `eliminar` — al reves que la baja (P-F de `permisos.md`).
 * Es la fila de la matriz que no sigue la intuicion y esta transcripta tal cual: un usuario puede
 * poder reactivar y no poder dar de baja.
 *
 * Es el unico endpoint que alcanza una fila que el query filter global esconde: la accion vive en el
 * kebab de las filas INACTIVAS, que solo se ven con `soloActivos = false`.
 *
 * El 409 `flota.conductor.persona_ya_es_conductor` NO es un error tecnico: el indice unico es
 * PARCIAL sobre `activo`, asi que la baja LIBERA a la persona y mientras tanto pudieron dar de alta
 * otro conductor para ella (mismo caso que D-S3-11 con el IMEI del dispositivo).
 *
 * NO resetea el estado operativo: es la contracara de que la baja no lo movio. Un conductor que se
 * dio de baja estando `suspendido` vuelve `suspendido`.
 */
export function useReactivarConductor() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, string>({
    mutationFn: async (conductorId) => {
      await conductoresService.reactivar(conductorId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flotaKeys.conductores() })
    },
  })
}
