import { httpClient } from '@/services/http/http-client'
import type {
  CatalogoCanonicoItemDto,
  CatalogoPageQuery,
  MarcaCatalogoDto,
  ModeloCatalogoDto,
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

export const catalogoService = {
  /** GET /catalogo/marcas?q=&page=&pageSize= -> 200 PagedResult<MarcaCatalogoDto> */
  listarMarcas: (query: CatalogoPageQuery = {}) =>
    httpClient.get<PagedResult<MarcaCatalogoDto>>(`${BASE}/marcas`, {
      params: query,
    }),

  /**
   * GET /catalogo/marcas/{marcaId}/modelos?q= -> 200 PagedResult<ModeloCatalogoDto>.
   *
   * Paso 2 de la cascada, y el ultimo que Flota consume: el `modeloId` que devuelve es el ANCLA
   * INTERMEDIA que viaja en el alta. Los pasos 3 (anios) y 4 (versiones) NO se usan acá — una flota
   * no conoce el trim de sus unidades, y exigirlo trabaria el alta.
   */
  listarModelos: (marcaId: string, query: CatalogoPageQuery = {}) =>
    httpClient.get<PagedResult<ModeloCatalogoDto>>(`${BASE}/marcas/${marcaId}/modelos`, {
      params: query,
    }),

  /** GET /catalogo/tipos-vehiculo -> 200 CatalogoCanonicoItemDto[] (lista entera, sin paginar) */
  listarTiposVehiculo: () =>
    httpClient.get<CatalogoCanonicoItemDto[]>(`${BASE}/tipos-vehiculo`),

  /**
   * GET /catalogo/buscar?q=focus 2020 se -> 200 PagedResult<VersionCaminoCompletoDto>.
   * Atajo transversal que saltea la cascada. 400 si `q` viene sin ningun termino.
   */
  buscar: (query: CatalogoPageQuery) =>
    httpClient.get<PagedResult<VersionCaminoCompletoDto>>(`${BASE}/buscar`, {
      params: query,
    }),
}
