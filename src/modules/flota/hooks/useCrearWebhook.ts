import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorWebhook } from '../query-keys'
import { integracionesService } from '@/services/flota/integraciones-service'
import type { CrearWebhookEndpointRequest, SecretoWebhookDto } from '@/services/contracts/flota'

/**
 * Alta de endpoint de webhook — `POST /api/flota/integraciones/webhooks`, permiso
 * `flota.integraciones.gestionar`.
 *
 * ⚠️ **La respuesta NO es el recurso: es el SECRETO, y sale una sola vez.** `SecretoWebhookDto` trae
 * `secreto` en claro y ningun `GET` lo vuelve a devolver — el listado solo expone `secretoHuella`.
 * Consecuencias que la pantalla tiene que resolver, no el hook:
 *  - el aviso de "copialo ahora, no vas a poder verlo de nuevo" va **ANTES** de que el modal se
 *    pueda cerrar, no despues;
 *  - el valor **no se persiste** en ningun store ni se loguea; vive en el estado local del modal y
 *    muere con el.
 *
 * ⚠️ **El endpoint nace SIN SUSCRIPCIONES** (PENDIENTE #3, mitad de DA-IN-08): el request no acepta
 * `eventos[]` ni `scopes[]` porque no tienen donde persistirse. Es fail-closed y **hay que decirlo
 * en el alta**: el endpoint creado **no va a recibir ninguna entrega automatica**, solo la explicita
 * del boton "Probar". Un alta que no lo aclara entrega un webhook que el integrador cree conectado.
 *
 * ⚠️ La `url` pasa por **anti-SSRF** (https obligatorio, sin IP privada/loopback/link-local, sin
 * hostname que resuelva a rango privado). El 400 `flota.webhook.url_no_permitida` llega con
 * `args {url}` y es de **campo**: va al input, no al banner.
 */
export function useCrearWebhook() {
  const queryClient = useQueryClient()

  return useMutation<SecretoWebhookDto, unknown, CrearWebhookEndpointRequest>({
    mutationFn: async (data) => {
      const respuesta = await integracionesService.crearEndpoint(data)
      return respuesta.data
    },
    onSuccess: () => {
      // Se invalida el prefijo entero: el alta cambia el listado, y el detalle del endpoint solo se
      // puede leer volviendo a listar (`api.md` no declara `GET /webhooks/{id}`).
      for (const key of flotaKeysAfectadasPorWebhook()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
