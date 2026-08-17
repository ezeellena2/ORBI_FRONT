import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'
import { parseApiError } from '@/shared/errors/parse-api-error'

/**
 * Documentos adjuntos del conductor (`GET .../{id}/documentos`).
 *
 * ⚠️ DEVUELVE UN ARRAY PLANO, no `PagedResult<T>`: `api.md` no declara paginacion para esta fila. Es
 * la unica lectura del modulo exenta de la convencion 3, y lo esta por contrato.
 *
 * ⚠️ PIDE `flota.conductores.gestionar-documentos`, NO `leer` (P-F). Un usuario que ve la ficha
 * perfectamente puede recibir **403 en esta llamada sola**: el bloque de documentos se trata como
 * FORBIDDEN POR BLOQUE (mensaje con el permiso literal en su tarjeta), no como forbidden de pagina —
 * el resto del detalle se sigue viendo.
 *
 * `estadoDerivado` lo calcula el BACKEND al leer (umbral 30 dias): el front no recalcula nada, solo
 * pinta el badge del codigo que llega.
 */
export function useDocumentosConductor(conductorId: string | undefined) {
  const id = conductorId ?? ''

  return useQuery({
    queryKey: flotaKeys.conductorDocumentos(id),
    queryFn: async () => {
      const respuesta = await conductoresService.listarDocumentos(id)
      return respuesta.data
    },
    enabled: id.length > 0,
    staleTime: 60_000,
    // Ni el 403 (falta de permiso) ni el 404 cambian con un reintento: solo duplican la latencia del
    // bloque. El 403 aca es esperable, no excepcional (ver el bloque de arriba).
    retry: (fallos, error) => {
      const status = parseApiError(error).status
      return status !== 403 && status !== 404 && fallos < 1
    },
  })
}
