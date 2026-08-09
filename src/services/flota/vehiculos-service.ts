import { appConfig } from '@/config/env'
import { httpClient } from '@/services/http/http-client'
import type {
  ActualizarVehiculoRequest,
  CrearVehiculoRequest,
  PagedResult,
  RecorridoDto,
  RecorridosQuery,
  VehiculoDetalleDto,
  VehiculoListItemDto,
  VehiculosPageQuery,
} from '@/services/contracts/flota'

/**
 * Cliente HTTP de la seccion §Vehiculos de `Flota.Api`. Un metodo por endpoint del contrato.
 * Funciones puras: hacen HTTP y devuelven la respuesta. Sin estado, sin stores, sin React.
 *
 * `baseURL` va por request y apunta a Flota (7213), no a Access: se reusa el `httpClient` para
 * heredar el interceptor de sesion (Bearer, 401 -> refresh -> retry, Accept-Language) en vez de
 * duplicar esa logica en una instancia nueva de axios.
 */

const BASE = '/api/flota/vehiculos'

const configFlota = { baseURL: appConfig.flotaApiBaseUrl } as const

export const vehiculosService = {
  /** GET /api/flota/vehiculos -> 200 PagedResult<VehiculoListItemDto> */
  listar: (query: VehiculosPageQuery = {}) =>
    httpClient.get<PagedResult<VehiculoListItemDto>>(BASE, {
      ...configFlota,
      params: query,
    }),

  /** GET /api/flota/vehiculos/{vehiculoFlotaId} -> 200 | 404 (404 tambien es cross-tenant) */
  obtener: (vehiculoFlotaId: string) =>
    httpClient.get<VehiculoDetalleDto>(`${BASE}/${vehiculoFlotaId}`, configFlota),

  /** POST /api/flota/vehiculos -> 201 VehiculoDetalleDto | 409 | 400 | 500 */
  crear: (data: CrearVehiculoRequest) =>
    httpClient.post<VehiculoDetalleDto>(BASE, data, configFlota),

  /** PATCH /api/flota/vehiculos/{vehiculoFlotaId} -> 200 VehiculoDetalleDto | 404 | 409 */
  actualizar: (vehiculoFlotaId: string, data: ActualizarVehiculoRequest) =>
    httpClient.patch<VehiculoDetalleDto>(`${BASE}/${vehiculoFlotaId}`, data, configFlota),

  /** DELETE /api/flota/vehiculos/{vehiculoFlotaId} -> 204 (baja logica) | 404 | 409 */
  eliminar: (vehiculoFlotaId: string) =>
    httpClient.delete<void>(`${BASE}/${vehiculoFlotaId}`, configFlota),

  /**
   * GET /api/flota/vehiculos/{vehiculoFlotaId}/recorridos -> ⚠ SIEMPRE 500 hoy, con
   * `code: flota.telemetria.no_disponible`. El caller discrimina por el `code`, nunca por el
   * status: en Flota no existe el 503 y un 500 generico no es lo mismo que esta degradacion.
   */
  listarRecorridos: (vehiculoFlotaId: string, query: RecorridosQuery = {}) =>
    httpClient.get<PagedResult<RecorridoDto>>(`${BASE}/${vehiculoFlotaId}/recorridos`, {
      ...configFlota,
      params: query,
    }),
}
