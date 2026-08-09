import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'
import type { RecorridosQuery } from '@/services/contracts/flota'

/**
 * Recorridos del vehículo — superficie ⚠ DEGRADADA a propósito.
 *
 * Lo pide el tab Historial de `f-06` y el cimiento del slice no lo construyó.
 *
 * HOY ESTE ENDPOINT RESPONDE SIEMPRE 500 con `code: flota.telemetria.no_disponible`: Telemetría no
 * persiste histórico de posiciones ni modela viajes, así que la superficie entera no tiene fuente
 * upstream (capa (b) de D-C1). El tab muestra el estado degradado con su motivo — NUNCA una tabla
 * vacía, que le diría al usuario "este vehículo no hizo recorridos", que es falso.
 *
 * `retry: false` es deliberado: el 500 degradado no es un error transitorio, es el estado del
 * contrato. Reintentarlo solo suma tres requests que van a fallar igual y retrasa el estado real.
 *
 * `enabled` lo controla la pantalla: el request sale cuando se abre el tab, no al montar la ficha.
 */
export function useRecorridosVehiculo(
  vehiculoFlotaId: string,
  query: RecorridosQuery = {},
  habilitado = true,
) {
  return useQuery({
    // `query-keys.ts` es del cimiento y no declara los recorridos, así que la key se compone sobre
    // el prefijo del detalle: invalidar `['flota','vehiculos']` la sigue alcanzando.
    queryKey: [...flotaKeys.vehiculoDetalle(vehiculoFlotaId), 'recorridos', query] as const,
    queryFn: async () => {
      const respuesta = await vehiculosService.listarRecorridos(vehiculoFlotaId, query)
      return respuesta.data
    },
    enabled: habilitado && vehiculoFlotaId.length > 0,
    retry: false,
    staleTime: 60_000,
  })
}
