import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { integracionesService } from '@/services/flota/integraciones-service'
import type { WebhooksPageQuery } from '@/services/contracts/flota'

/**
 * Log de entregas de webhook. Permiso `flota.integraciones.leer`.
 *
 * `staleTime` **30 s**: es un log, no configuracion — cambia por eventos externos (un reintento, una
 * prueba) y no solo por lo que hace el usuario en esta pestana. Aun asi **no hace polling**: es
 * auditoria, no un monitor. La unica accion que agrega una fila desde esta pantalla ("Probar")
 * invalida el prefijo y la trae al dia.
 *
 * ⚠️ **Es de TODA la organizacion, no de un endpoint.** `api.md` declara la ruta como
 * `/webhooks/entregas`, sin `{webhookId}` y sin ningun filtro. "Ver entregas de este webhook" se
 * resuelve filtrando por `webhookEndpointId` **sobre lo que ya llego**, y la pantalla tiene que
 * rotularlo como tal: mandar un query param que el contrato no nombra devuelve la lista entera sin
 * filtrar, y el usuario cree que filtro.
 *
 * ⚠️ La tabla tiene que poder pintar **los 5** estados (`pendiente` · `enviado` · `fallido` ·
 * `reintentando` · `agotado`); el mockup solo muestra 3.
 *
 * ⚠️ **`reintentando` no avanza solo** (B-40): nadie drena la cola y el cuerpo original no es
 * reconstruible. Una fila en ese estado se queda ahi. Por eso su badge es `advertencia` y no `info`,
 * y por eso **no se dibuja el boton "Forzar"/"Reintentar"**.
 *
 * ⚠️ `errorResumen` ya **no** es texto del receptor: desde el cierre de slice-06 persiste la
 * constante `http_error`. El diagnostico util es `httpStatus`.
 */
export function useEntregasWebhook(query: WebhooksPageQuery = {}) {
  return useQuery({
    queryKey: flotaKeys.webhookEntregas(query),
    queryFn: async () => {
      const respuesta = await integracionesService.listarEntregas(query)
      return respuesta.data
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
