import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorWebhook } from '../query-keys'
import { integracionesService } from '@/services/flota/integraciones-service'
import type { SecretoWebhookDto } from '@/services/contracts/flota'

/**
 * Rotar el secreto HMAC — `POST .../webhooks/{webhookId}/rotar-secreto`, permiso
 * `flota.integraciones.gestionar`.
 *
 * ⚠️ **Devuelve el secreto nuevo UNA SOLA VEZ.** Igual que el alta: no se persiste en ningun store,
 * no se loguea, y el aviso de "copialo ahora" va **ANTES** de que el modal se pueda cerrar. Despues,
 * la pantalla solo puede mostrar `secretoHuella`.
 *
 * ══ ⚠️ B-39 — LO QUE EL COPY DE ESTA ACCION NO PUEDE DECIR ══════════════════════════════════════
 * `api.md` §Rotacion promete una **ventana de gracia**: el secreto anterior sigue validando para que
 * el receptor despliegue el cambio *sin perder entregas*. **Hoy eso es falso.** Flota firma con el
 * nuevo desde t=0 y manda **una sola** firma en `X-Orbi-Signature`; el viejo queda con
 * `vigente_hasta` futuro y **ningun camino de produccion lo lee**.
 *
 * ⇒ `secretoAnteriorVigenteHastaUtc` llega poblado y es **dato inerte**. Mostrarlo como "tenes hasta
 * las 15:40 para actualizar el receptor" es la peor version del error: el integrador se toma el
 * tiempo que le ofrecemos y **pierde el 100 % de las entregas desde el instante de la rotacion**.
 *
 * El unico aviso honesto hoy es que rotar **exige coordinar el despliegue del receptor**. El copy
 * vive en `flota:centroBloqueado.ventanaDeGracia`.
 */
export function useRotarSecretoWebhook(webhookId: string) {
  const queryClient = useQueryClient()

  return useMutation<SecretoWebhookDto, unknown, void>({
    mutationFn: async () => {
      const respuesta = await integracionesService.rotarSecreto(webhookId)
      return respuesta.data
    },
    onSuccess: () => {
      // La huella del listado cambia con la rotacion; el secreto NO entra a la cache.
      for (const key of flotaKeysAfectadasPorWebhook()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
