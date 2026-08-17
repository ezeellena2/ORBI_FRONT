import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'
import type { HistorialConductorQuery } from '@/services/contracts/flota'

/**
 * Vinculos conductor<->dispositivo de un conductor (`GET .../{id}/dispositivos`), paginado, ORDER BY
 * desde DESC + id DESC. Incluye los CERRADOS: `activa` los distingue.
 *
 * ⚠️ ES ATRIBUCION, NO FUENTE DE POSICION (D1). Espeja el par driver<->device de Traccar y sirve
 * para atribuir viajes y eventos; la posicion del conductor SIEMPRE deriva del vehiculo que conduce.
 * Ningun bloque de "ubicacion del conductor" puede leer de aca.
 *
 * Es N:N historico: el mismo GPS puede estar vinculado a varios conductores a lo largo del tiempo.
 *
 * `query` tiene que ser estable POR VALOR entre renders (regla de `query-keys.ts`).
 */
export function useDispositivosConductor(
  conductorId: string | undefined,
  query: HistorialConductorQuery = {},
) {
  const id = conductorId ?? ''

  return useQuery({
    queryKey: flotaKeys.conductorDispositivos(id, query),
    queryFn: async () => {
      const respuesta = await conductoresService.listarDispositivos(id, query)
      return respuesta.data
    },
    enabled: id.length > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
