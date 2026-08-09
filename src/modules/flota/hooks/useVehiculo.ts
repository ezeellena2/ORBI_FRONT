import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'
import { parseApiError } from '@/shared/errors/parse-api-error'

/**
 * Detalle de un vehiculo. `staleTime` 60 s (`frontend.md` §5): son datos funcionales estables.
 *
 * Un 404 puede ser "no existe" o "es de otra organizacion": el backend los hace indistinguibles a
 * proposito (cross-tenant = 404 uniforme, nunca 403), asi que la pantalla tampoco intenta
 * diferenciarlos.
 *
 * Partial-data: lo que compone Telemetria llega en `null` y todo lo propio de Flota se renderiza
 * igual. No es un error de pantalla.
 */
export function useVehiculo(vehiculoFlotaId: string | undefined) {
  const id = vehiculoFlotaId ?? ''

  return useQuery({
    queryKey: flotaKeys.vehiculoDetalle(id),
    queryFn: async () => {
      const respuesta = await vehiculosService.obtener(id)
      return respuesta.data
    },
    enabled: id.length > 0,
    staleTime: 60_000,
    // Reintentar un 404 solo duplica la latencia de la pantalla "Vehiculo no encontrado": el
    // backend ya dijo que ese id no existe para esta organizacion y no va a cambiar de opinion.
    retry: (fallos, error) => parseApiError(error).status !== 404 && fallos < 1,
  })
}
