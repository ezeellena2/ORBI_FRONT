import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorWebhook } from '../query-keys'
import { integracionesService } from '@/services/flota/integraciones-service'

/**
 * Pausar / activar un endpoint desde el **kebab de la card** —
 * `PATCH .../webhooks/{webhookId}` con `{ activo }`, permiso `flota.integraciones.gestionar`.
 *
 * ── POR QUE EXISTE, TENIENDO `useActualizarWebhook` ───────────────────────────────────────────
 * `useActualizarWebhook(webhookId)` fija el id en la construccion del hook, y eso sirve para el
 * modal (un endpoint a la vez). En una **lista** el id lo trae la card que el usuario toco, y un hook
 * por card no se puede llamar. Acá el id viaja como **variable de la mutacion**.
 *
 * No duplica la capa HTTP: mismo `integracionesService.actualizarEndpoint`, mismo prefijo invalidado.
 *
 * ⚠️ **`activo: false` PAUSA, no da de baja**: es la columna `habilitado`. La card sigue en la lista
 * con badge `Inactivo` —la etiqueta la fija la tabla de derivacion del contrato (`dtos.ts` §9), no
 * esta pantalla— y su log de entregas **no se toca**. La baja logica es el `DELETE`.
 *
 * ⚠️ Un endpoint pausado muestra "Inactivo" **aunque su ultima entrega haya fallado**: el badge
 * derivado prioriza `activo` sobre `ultimoEstado` a proposito — mostrarlo "Fallando" mandaria a
 * alguien a arreglar algo que esta apagado adrede.
 */
export function useAlternarEstadoDeWebhook() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, { webhookId: string; activo: boolean }>({
    mutationFn: async ({ webhookId, activo }) => {
      // Responde 204 sin cuerpo: no hay nada que sembrar en la cache, solo invalidar.
      await integracionesService.actualizarEndpoint(webhookId, { activo })
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorWebhook()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
