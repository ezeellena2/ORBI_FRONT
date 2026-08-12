import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'
import { parseApiError } from '@/shared/errors/parse-api-error'

/**
 * Detalle de un conductor operativo. Calca `useVehiculo` / `useDispositivo`: mismo `staleTime`,
 * misma politica de reintento y la misma lectura del 404.
 *
 * Un 404 puede ser "no existe" o "es de otra organizacion": el backend los hace indistinguibles a
 * proposito (el filtro por `OrganizacionId` va en el WHERE, asi que cross-tenant es 404 y nunca
 * 403), y la pantalla tampoco intenta diferenciarlos.
 *
 * Partial-data: la identidad canonica proyectada (`nombreCompleto`, `dni`, `telefonoPrincipal`) y
 * `licencia.categoria` pueden llegar `null` dentro de un 200. Se resuelve con fallback por bloque;
 * todo lo propio de Flota (estado, asignaciones, documentos obligatorios) se sigue viendo.
 */
export function useConductor(conductorId: string | undefined) {
  const id = conductorId ?? ''

  return useQuery({
    queryKey: flotaKeys.conductorDetalle(id),
    queryFn: async () => {
      const respuesta = await conductoresService.obtener(id)
      return respuesta.data
    },
    enabled: id.length > 0,
    staleTime: 60_000,
    // Reintentar un 404 solo duplica la latencia de la pantalla "Conductor no encontrado": el
    // backend ya dijo que ese id no existe para esta organizacion y no va a cambiar de opinion.
    retry: (fallos, error) => parseApiError(error).status !== 404 && fallos < 1,
  })
}
