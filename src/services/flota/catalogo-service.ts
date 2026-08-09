import { appConfig } from '@/config/env'
import { httpClient } from '@/services/http/http-client'
import type {
  CatalogoCanonicoItemDto,
  CatalogoPageQuery,
  MarcaCatalogoDto,
  PagedResult,
  VersionCaminoCompletoDto,
} from '@/services/contracts/flota'

/**
 * Catalogo de vehiculos — vive en PlataformaCanonica (7203), NO en Flota.
 *
 * Marca y tipo de vehiculo son catalogos CANONICOS y globales (Decision B): no tienen
 * `organizacion_id` y los comparten todos los modulos. El archivo vive en `services/flota/` porque
 * es el consumidor de este slice; el duenio del dato sigue siendo el Canonico.
 *
 * Estado real del dato (2026-08-09): los 4 catalogos chicos estan sembrados; las tablas grandes
 * (marcas/modelos/fabricaciones/versiones) estan VACIAS hasta que se decida la fuente (DA-CAT-02).
 * Un listado de marcas vacio es una respuesta correcta, no un error: la UI muestra su empty
 * honesto y jamas una lista hardcodeada.
 */

const BASE = '/api/plataforma-canonica/catalogo'

const configCanonica = { baseURL: appConfig.canonicaApiBaseUrl } as const

export const catalogoService = {
  /** GET /catalogo/marcas?q=&page=&pageSize= -> 200 PagedResult<MarcaCatalogoDto> */
  listarMarcas: (query: CatalogoPageQuery = {}) =>
    httpClient.get<PagedResult<MarcaCatalogoDto>>(`${BASE}/marcas`, {
      ...configCanonica,
      params: query,
    }),

  /** GET /catalogo/tipos-vehiculo -> 200 CatalogoCanonicoItemDto[] (lista entera, sin paginar) */
  listarTiposVehiculo: () =>
    httpClient.get<CatalogoCanonicoItemDto[]>(`${BASE}/tipos-vehiculo`, configCanonica),

  /**
   * GET /catalogo/buscar?q=focus 2020 se -> 200 PagedResult<VersionCaminoCompletoDto>.
   * Atajo transversal que saltea la cascada. 400 si `q` viene sin ningun termino.
   */
  buscar: (query: CatalogoPageQuery) =>
    httpClient.get<PagedResult<VersionCaminoCompletoDto>>(`${BASE}/buscar`, {
      ...configCanonica,
      params: query,
    }),
}
