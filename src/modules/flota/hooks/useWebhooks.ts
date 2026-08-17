import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { integracionesService } from '@/services/flota/integraciones-service'
import type { WebhooksPageQuery } from '@/services/contracts/flota'

/**
 * Listado de endpoints de webhook saliente. Permiso `flota.integraciones.leer`.
 *
 * `staleTime` **60 s**: es configuracion, se toca por CRUD. `frontend.md` §5 no tiene fila propia
 * para integraciones; se usa el mismo criterio que para reglas ("cambian poco"). Toda mutacion
 * invalida el prefijo `['flota','integraciones']`, que alcanza tambien a la tabla de entregas.
 *
 * ⚠️ **Nunca trae el secreto**, solo `secretoHuella`. El secreto completo sale una unica vez, en la
 * respuesta del alta y en la de la rotacion.
 *
 * ⚠️ `eventos` y `scopes` llegan **siempre vacios** (PENDIENTE #3): es la contracara de que el alta
 * no los acepte, **no** "es un endpoint recien creado". Consecuencia que la card tiene que decir:
 * un endpoint **no tiene suscripciones**, asi que **no recibe ninguna entrega automatica** — la
 * unica entrega que existe es la explicita de "Probar". El fan-out no esta construido.
 *
 * ⚠️ El badge del endpoint **se DERIVA** de `activo` + `ultimoEstado` con
 * `estadoDerivadoDeWebhook` (vocabulario del Centro); no hay enum nuevo y las etiquetas del mockup
 * (`Activo`/`Reintento`/`Pausado`) son demo.
 */
export function useWebhooks(query: WebhooksPageQuery = {}) {
  return useQuery({
    queryKey: flotaKeys.webhooksListado(query),
    queryFn: async () => {
      const respuesta = await integracionesService.listarEndpoints(query)
      return respuesta.data
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}
