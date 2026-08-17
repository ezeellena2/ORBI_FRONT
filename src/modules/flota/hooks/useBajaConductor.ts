import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'

/**
 * Baja LOGICA del conductor (`POST .../{id}/baja` -> 204, permiso `flota.conductores.eliminar`).
 *
 * Es REVERSIBLE por `useReactivarConductor`. NO confundir con `useEliminarConductor`, que borra la
 * fila y no se puede deshacer.
 *
 * ⚠️ NO RESETEA EL ESTADO OPERATIVO: los dos ejes son ortogonales (DA-CD2-19), asi que un conductor
 * dado de baja conserva su `estado`. La reactivacion tampoco lo mueve.
 *
 * ⚠️ CON ASIGNACION VIGENTE **RECHAZA**, no desasigna: 409
 * `flota.conductor.baja_con_asignacion_activa` — de vehiculo O de dispositivo. `api.md` describe la
 * baja como "desasigna vehiculo activo" y `errores.md` define este code que la bloquea; el backend
 * resolvio el drift a favor de `errores.md`, que es el dueno de los codes, y lo dejo REPORTADO para
 * el PO. **El copy del modal no debe prometer que desasigna**: hasta que el PO decida, la UI muestra
 * el mensaje del 409 y pide desasignar primero.
 *
 * El "revoca acceso movil" que menciona `api.md` NO se implementa: el acceso es de Access/Canonica y
 * Flota no escribe esos schemas. No prometerlo tampoco.
 *
 * El id viaja como variable de la mutation (no bindeado) para que sirva igual desde el kebab de una
 * fila del listado y desde la ficha.
 */
export function useBajaConductor() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, string>({
    mutationFn: async (conductorId) => {
      await conductoresService.darDeBaja(conductorId)
    },
    onSuccess: () => {
      // 204 sin cuerpo: no hay detalle con el que sembrar la cache, solo se invalida el prefijo.
      void queryClient.invalidateQueries({ queryKey: flotaKeys.conductores() })
    },
  })
}
