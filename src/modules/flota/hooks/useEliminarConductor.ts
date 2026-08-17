import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'

/**
 * HARD-DELETE del conductor (`DELETE .../{id}` -> 204, permiso `flota.conductores.eliminar`).
 *
 * No confundir con `useBajaConductor`: la baja es logica y REVERSIBLE; esto borra la fila y NO se
 * puede deshacer. Por eso la confirmacion es fuerte (tipear el nombre o el DNI exacto) y el copy si
 * dice que es irreversible.
 *
 * Solo aparece en filas INACTIVAS (ficha §6). El contrato lo permite unicamente SIN dependencias ni
 * historial (asignaciones a vehiculos, vinculos con dispositivos, documentos); con dependencias
 * devuelve 409 `flota.recurso.tiene_dependencias` (`args {recurso}`), que la pantalla muestra
 * traducido SIN cerrar el dialogo.
 *
 * ⚠️ La PII proyectada del conductor se purga con el hard-delete, salvo que quede otro conductor de
 * la misma persona en la organizacion (D-S4-3). No es reversible por ninguna via de la API.
 */
export function useEliminarConductor() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, string>({
    mutationFn: async (conductorId) => {
      await conductoresService.eliminar(conductorId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flotaKeys.conductores() })
    },
  })
}
