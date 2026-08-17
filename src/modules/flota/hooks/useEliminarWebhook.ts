import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorWebhook } from '../query-keys'
import { integracionesService } from '@/services/flota/integraciones-service'

/**
 * Eliminar un endpoint — `DELETE .../webhooks/{webhookId}` -> **204**, permiso
 * `flota.integraciones.gestionar`.
 *
 * ⚠️ **Es baja LOGICA**, no hard-delete: la fila sigue existiendo y deja de recibir entregas, como
 * toda baja del modulo. Y **el log de entregas ya emitidas no se toca** — es la auditoria de a donde
 * salio cada payload. El copy de la confirmacion no debe decir "se borra el historial de envios",
 * porque no se borra.
 *
 * ⚠️ A diferencia de la baja de dispositivo y de conductor, **acá no hace falta sacar al usuario de
 * ninguna URL**: no existe pantalla de detalle de webhook (`api.md` no declara
 * `GET /webhooks/{id}`), asi que la unica superficie es la lista, y ahi ver la card desaparecer
 * **es** el resultado de la accion (mismo criterio que D-S4F-7 aplico al listado de conductores).
 */
export function useEliminarWebhook(webhookId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, void>({
    mutationFn: async () => {
      await integracionesService.eliminarEndpoint(webhookId)
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorWebhook()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
