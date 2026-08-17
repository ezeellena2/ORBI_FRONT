import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorWebhook } from '../query-keys'
import { integracionesService } from '@/services/flota/integraciones-service'
import type { ActualizarWebhookEndpointRequest } from '@/services/contracts/flota'

/**
 * Editar / activar / pausar un endpoint — `PATCH .../webhooks/{webhookId}`, permiso
 * `flota.integraciones.gestionar`.
 *
 * ⚠️ **RESPONDE 204 SIN CUERPO** (verificado contra `IntegracionesController.ActualizarEndpoint` ->
 * `NoContent()`). No sembrar la respuesta en la cache: con axios el cuerpo de un 204 es el string
 * vacio. Solo se invalida el prefijo.
 *
 * ⚠️ `activo: false` **PAUSA, no da de baja**: es la columna `habilitado`. La fila sigue en el
 * listado y su log de entregas no se toca. La baja logica es el `DELETE`.
 *
 * ⚠️ Un endpoint pausado muestra badge **"Inactivo" aunque su ultima entrega haya fallado**: el
 * derivado prioriza `activo` sobre `ultimoEstado` a proposito — mostrarlo "Fallando" mandaria a
 * alguien a arreglar algo que esta apagado adrede.
 *
 * ⚠️ **No borra campos** (B-18): lo ausente se preserva. Cambiar la URL la revalida anti-SSRF, con
 * el mismo 400 de campo que el alta.
 */
export function useActualizarWebhook(webhookId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, ActualizarWebhookEndpointRequest>({
    mutationFn: async (data) => {
      await integracionesService.actualizarEndpoint(webhookId, data)
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorWebhook()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
