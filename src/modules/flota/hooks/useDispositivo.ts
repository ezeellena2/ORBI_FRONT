import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'
import { parseApiError } from '@/shared/errors/parse-api-error'

/**
 * Detalle de un dispositivo GPS. Calca `useVehiculo`: mismo `staleTime`, misma politica de reintento
 * y la misma lectura del 404.
 *
 * Un 404 puede ser "no existe" o "es de otra organizacion": el backend los hace indistinguibles a
 * proposito (el filtro por `OrganizacionId` va en el WHERE, asi que cross-tenant es 404 y nunca
 * 403), y la pantalla tampoco intenta diferenciarlos.
 *
 * Partial-data (D-C1 a): lo que compone Telemetria llega en `null` dentro de una respuesta 200 y
 * todo lo propio de Flota se renderiza igual. No es un error de pantalla, asi que no tiene rama.
 */
export function useDispositivo(dispositivoId: string | undefined) {
  const id = dispositivoId ?? ''

  return useQuery({
    queryKey: flotaKeys.dispositivoDetalle(id),
    queryFn: async () => {
      const respuesta = await dispositivosService.obtener(id)
      return respuesta.data
    },
    enabled: id.length > 0,
    staleTime: 60_000,
    // Reintentar un 404 solo duplica la latencia de la pantalla "Dispositivo no encontrado": el
    // backend ya dijo que ese id no existe para esta organizacion y no va a cambiar de opinion.
    retry: (fallos, error) => parseApiError(error).status !== 404 && fallos < 1,
  })
}
