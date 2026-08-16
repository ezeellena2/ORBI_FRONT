import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorWebhook } from '../query-keys'
import { integracionesService } from '@/services/flota/integraciones-service'
import type { ResultadoPruebaWebhookDto } from '@/services/contracts/flota'

/**
 * Probar un endpoint — `POST .../webhooks/{webhookId}/probar`, permiso
 * `flota.integraciones.gestionar` (**no es una lectura**: sale una request firmada al sistema del
 * cliente, por eso el permiso es de gestion aunque el boton parezca inofensivo).
 *
 * ⚠️ **ESTA ES LA UNICA ENTREGA QUE HOY EXISTE EN TODO EL SISTEMA.** Como el alta no acepta
 * `eventos[]`, ningun endpoint tiene suscripciones y **no llega nada automatico** (PENDIENTE #3). El
 * copy del boton no debe sugerir que "ademas van a empezar a llegar los eventos".
 *
 * ⚠️ **Devuelve 200 aunque el receptor haya fallado.** El resultado de la prueba es un DATO, no un
 * error de la API: se lee en `entrega.estado` + `entrega.httpStatus` + `entrega.errorResumen`.
 * Ramificar por el status HTTP de esta llamada perderia exactamente el caso interesante — el hook no
 * lo trata como fallo y la pantalla tampoco debe hacerlo.
 *
 * ⚠️ **Probar NO marca al endpoint como sano.** El invariante de `api.md` §Endpoint de prueba es
 * *efecto secundario cero*: no genera problema operativo, no entra al motor de reglas, no abre
 * alerta y no publica nada al bus interno. Lo unico que produce es **una** fila en el log. El badge
 * del endpoint se mueve solo porque se deriva de `ultimoEstado`, que es esa fila.
 *
 * Se invalida el prefijo entero porque la prueba mueve **dos** superficies: la card del endpoint
 * (`ultimoEstado` + `ultimoEnvioUtc`) y la tabla de entregas (una fila nueva).
 */
export function useProbarWebhook(webhookId: string) {
  const queryClient = useQueryClient()

  return useMutation<ResultadoPruebaWebhookDto, unknown, void>({
    mutationFn: async () => {
      const respuesta = await integracionesService.probar(webhookId)
      return respuesta.data
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorWebhook()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
