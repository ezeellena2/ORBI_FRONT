import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { POLLING_MAPA_MS } from '../vocabulario-mapa'
import { mapaService } from '@/services/flota/mapa-service'

/**
 * Detalle en vivo de UN vehiculo — el panel derecho del mapa, pestaña "Actual".
 *
 * Se pide **solo con un vehiculo seleccionado** (`enabled`): el panel arranca cerrado, y una query
 * con `vehiculoFlotaId` vacio seria un request a `/mapa/vehiculos//en-vivo`.
 *
 * Misma cadencia que el mapa, y por el mismo motivo: el panel muestra velocidad, ignicion y posicion,
 * que envejecen igual que los marcadores. Con la pestaña oculta **no sale ningun request** —ver el
 * detalle en `useMapaEnVivo`—, asi que abrir el panel no duplica el costo de tener la app de fondo.
 *
 * ── DIFERENCIA REAL CON EL LISTADO DEL MAPA ────────────────────────────────────────────────────
 * Esta es una superficie de UN recurso, asi que el backend SI puede usar los endpoints per-vehiculo
 * de Telemetria (3 llamadas para 1 vehiculo no es fan-out). Por eso aca **rumbo y altitud traen
 * dato**, a diferencia de `MapaItemDto.ubicacion.direccionGrados`, que viaja siempre `null` (B-33).
 *
 * ── PARTIAL-DATA, NO ERROR ─────────────────────────────────────────────────────────────────────
 * Con Telemetria sin responder el endpoint devuelve **200** con `posicion`, `rumbo`, `velocidadKmh`,
 * `ignicion`, `motor`, `odometroKm` y `altitud` en `null`, y los datos propios de Flota (patente,
 * conductor asignado) intactos. El panel imprime su marcador de dato ausente por campo; no hay flag
 * en el DTO que distinga "no reporto" de "Telemetria caida", asi que el copy no elige causa.
 *
 * El unico error de verdad es el **404**, que es cross-tenant o inexistente indistinguiblemente
 * (nunca 403: el tenant va en el WHERE). No se reintenta: un id que no existe no va a existir en el
 * proximo intento.
 */
export function useVehiculoEnVivo(vehiculoFlotaId: string | null) {
  return useQuery({
    queryKey: flotaKeys.mapaVehiculoEnVivo(vehiculoFlotaId ?? ''),
    queryFn: async () => {
      const respuesta = await mapaService.obtenerEnVivo(vehiculoFlotaId ?? '')
      return respuesta.data
    },
    enabled: vehiculoFlotaId !== null,
    staleTime: 0,
    refetchInterval: POLLING_MAPA_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  })
}
