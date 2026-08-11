import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'

/**
 * HARD-DELETE del dispositivo (`DELETE .../{id}` -> 204). Es la accion "Eliminar" del kebab del
 * listado, gateada por `flota.dispositivos.eliminar` y OCULTA sin el permiso.
 *
 * No confundir con `useBajaDispositivo`: la baja es logica, coherente y REVERSIBLE; esto borra la
 * fila y NO se puede deshacer. Por eso el copy de la confirmacion si dice que es irreversible y por
 * eso se pide tipear el alias.
 *
 * El contrato solo lo permite sin dependencias ni historial; con dependencias devuelve 409
 * (`flota.dispositivo.baja_con_asignacion_activa` cuando esta instalado en un vehiculo). La pantalla
 * muestra ese `code` traducido y NO cierra el dialogo.
 *
 * Invalida el prefijo `['flota','dispositivos']`, que alcanza al listado con cualquier filtro y al
 * detalle del dispositivo borrado.
 */
export function useEliminarDispositivo() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, string>({
    mutationFn: async (dispositivoId) => {
      await dispositivosService.eliminar(dispositivoId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flotaKeys.dispositivos() })
    },
  })
}
