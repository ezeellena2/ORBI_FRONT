import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'

/**
 * Elimina un documento del conductor (`DELETE .../{id}/documentos/{documentoId}` -> 204, permiso
 * `flota.conductores.gestionar-documentos`).
 *
 * ⚠️ NO BORRA NADA EN EL DESTINO DE `urlExterna`: ese storage es de la organizacion, no de Flota. La
 * confirmacion no puede decir "se elimina el archivo" — se elimina el REGISTRO.
 *
 * Un `documentoId` que existe en la organizacion pero cuelga de OTRO conductor devuelve 404
 * `flota.recurso.organizacion_invalida` (regla de rutas anidadas, ex-403 reasignado).
 *
 * Invalida el prefijo del conductor: borrar la licencia cambia tambien `licencia`,
 * `documentosObligatorios` y el badge del listado.
 */
export function useEliminarDocumentoConductor(conductorId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, string>({
    mutationFn: async (documentoId) => {
      await conductoresService.eliminarDocumento(conductorId, documentoId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flotaKeys.conductores() })
    },
  })
}
