/**
 * Espejo del contrato de Flota — slice-02 (vehiculos).
 *
 * FUENTE UNICA: `TracAutoV2/src/Flota/docs/00-contrato/dtos.ts`. Redefinir un shape aca esta
 * prohibido: si falta un campo, se corrige el contrato del backend, no este archivo.
 *
 * Este archivo solo espeja lo que USA el slice-02. Los shapes de conductores, dispositivos,
 * geozonas, problemas, integraciones y mapa quedan fuera a proposito: llegan con sus slices.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * DRIFT CONTRATO ↔ BACKEND REAL (verificado contra
 * `TracAutoV2/src/Flota/Flota.Application/DTOs/VehiculoDtos.cs`, que es el codigo que corre)
 *
 * `dtos.ts` declara `patente`, `marca`, `modelo`, `anio` y `tipo` como NO nulables. El backend los
 * declara nullable a proposito (`string?` / `int?`), porque salen de la proyeccion local del
 * canonico y esa proyeccion puede no estar vigente. Tiparlos no-nulos aca no arregla el dato: solo
 * mueve la explosion de la capa de red al `.toUpperCase()` de una celda de tabla. Se espejan como
 * `| null` y la UI resuelve la ausencia con su fallback.
 *
 * Lo mismo con `pagination.fromItem` / `toItem`: `dtos.ts` dice `number`, `Platform.Pagination`
 * los emite `long?` y valen `null` cuando la pagina viene vacia.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

/* ============================================================================
 * 1. PAGINACION — contrato de `Platform.Pagination` (no es propio de Flota)
 * Params de query: page / pageSize / sortBy / sortDirection.
 * Defaults de plataforma: page 1 · pageSize 20 · max 100 · orden Desc.
 * PROHIBIDOS `PaginatedResponse` y `BaseListFilters` (B-17).
 * ========================================================================== */

export type SortDirection = 'Asc' | 'Desc'

export interface PageQuery {
  page?: number // default 1; < 1 se normaliza a 1
  pageSize?: number // default 20; < 1 -> 20, > 100 -> 100
}

export interface SortedPageQuery<TSortBy extends string> extends PageQuery {
  sortBy?: TSortBy // enum PROPIO por endpoint
  sortDirection?: SortDirection // default 'Desc'
}

export interface PaginationMetadata {
  page: number
  pageSize: number
  itemCount: number
  totalItems: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  // DRIFT: `dtos.ts` los declara `number`. `PaginationMetadata` de Platform.Pagination los emite
  // `long?` y son null cuando la pagina no trae items.
  fromItem: number | null
  toItem: number | null
}

export interface PagedResult<T> {
  items: T[]
  pagination: PaginationMetadata
}

/* ============================================================================
 * 2. VOCABULARIOS COMPARTIDOS (catalogos DB, codigos snake_case — D-7)
 * El DTO expone el MISMO string que la DB. La traduccion es de i18n en la UI;
 * lo que viaja al backend es siempre el codigo snake_case.
 * ========================================================================== */

/**
 * Estado de CONEXION (derivado, compuesto por Flota desde Telemetria).
 * `incompleto` = sin dispositivo asignado; `sin_dato` = Telemetria no responde o unknown.
 * Hoy el backend sirve SIEMPRE `sin_dato`: Telemetria se compone en slice-05 (partial-data, D-C1).
 */
export type EstadoConexion = 'en_linea' | 'desconectado' | 'incompleto' | 'sin_dato'

/**
 * Estado OPERATIVO persistido (`flota.vehiculos_flota.estado_operativo`). Distinto de
 * `EstadoConexion` (Telemetria) y de `activo` (baja logica). `baja_operativa` NO es destino valido
 * del PATCH: lo escribe el DELETE.
 */
export type EstadoOperativoVehiculo = 'operativo' | 'fuera_de_servicio' | 'baja_operativa'

export type RolAsignacionConductor = 'principal' | 'secundario'

/* ============================================================================
 * 3. VEHICULOS
 * ========================================================================== */

export interface VehiculoDispositivoAsignadoDto {
  dispositivoFlotaId: string
  alias: string // alias operativo
  imei: string // proyeccion local del canonico
}

export interface VehiculoConductorPrincipalDto {
  conductorFlotaId: string
  personaId: string
  nombreCompleto: string // proyeccion local
}

export interface UltimaSenalDto {
  fechaUtc: string // ISO 8601
  velocidadKmH: number
  ignicion: boolean
}

export interface VehiculoListItemDto {
  id: string // flota.vehiculos_flota.id — el `vehiculoFlotaId` de la API (A-4)
  vehiculoCanonicoId: string // ref a plataforma_canonica.vehiculos.id
  alias: string | null // apodo operativo editable en Flota
  // Identidad canonica proyectada. Ver el bloque DRIFT del encabezado: el contrato las declara
  // no-nulables y el backend las sirve nullable cuando no hay proyeccion vigente.
  patente: string | null
  marca: string | null
  modelo: string | null
  anio: number | null
  tipo: string | null // codigo del catalogo canonico de tipos, snake_case
  dispositivo: VehiculoDispositivoAsignadoDto | null // null si sin dispositivo asignado
  conductorPrincipal: VehiculoConductorPrincipalDto | null // null si sin conductor
  conductoresCount: number // total asignados (incluye principal)
  estadoOperativo: EstadoOperativoVehiculo
  // Estado de CONEXION compuesto desde Telemetria. Partial-data (D-C1 a): si Telemetria no
  // responde vale `sin_dato` y los datos propios se sirven igual, sin flag nuevo en el DTO.
  estado: EstadoConexion
  ultimaSenal: UltimaSenalDto | null // null si nunca emitio
  fechaCreacion: string // ISO 8601
  activo: boolean
}

export interface VehiculoConductorAsignadoDto {
  conductorFlotaId: string
  personaId: string
  nombreCompleto: string
  rol: RolAsignacionConductor
  fechaAsignacion: string
  // Proyeccion READ-ONLY desde Persona/Conductor canonico (P-A). Se editan en la superficie
  // canonica, NO en Flota.
  dni: string
  email: string | null
  telefono: string | null
  categoriaLicencia: string | null // codigo de catalogo en minuscula ('b1', 'c1')
}

/** DIFERIDO — pendiente DA-08 (geozonas fuera del MVP). El backend lo sirve siempre vacio. */
export interface VehiculoGeozonaAsignadaDto {
  geozonaFlotaId: string
  nombre: string
  tipoEvento: 'entrada' | 'salida' | 'ambos'
}

export interface VehiculoDetalleDto extends VehiculoListItemDto {
  vin: string | null // proyeccion canonico
  color: string | null // proyeccion canonico
  // PENDIENTE (DA-nueva, C-6): `combustible` no tiene columna fuente ni en Flota ni en el canonico.
  // El backend lo sirve siempre null y la UI NO lo renderiza hasta que el PO decida.
  combustible: string | null
  kilometrajeActual: number | null // dato operativo de Flota (km)
  notasOperativas: string | null
  conductoresAsignados: VehiculoConductorAsignadoDto[]
  geozonasAsignadas: VehiculoGeozonaAsignadaDto[] // DIFERIDO DA-08 — no borrar
  fechaActualizacion: string
  creadoPorUsuarioId: string | null
  modificadoPorUsuarioId: string | null
  creadoPorNombre: string | null // proyeccion usuario->persona; hoy siempre null
  modificadoPorNombre: string | null // idem
}

/**
 * POST /api/flota/vehiculos -> 201 `VehiculoDetalleDto`.
 * Flota resuelve/crea el vehiculo canonico via Refit y despues inserta la fila local.
 * Errores: `flota.vehiculo.patente_duplicada` (409), `flota.vehiculo.canonico_no_creable` (500).
 */
export interface CrearVehiculoRequest {
  // Datos canonicos
  patente: string // formato AR: 'AA 123 BB' o 'ABC 123'
  marca: string
  modelo: string
  anio: number
  tipo: string // codigo de catalogo (snake_case)
  vin?: string
  color?: string
  combustible?: string // PENDIENTE (DA-nueva, C-6) — se acepta y hoy no se persiste

  // Datos operativos (escritos directo en Flota)
  alias?: string // apodo operativo; `estadoOperativo` NO se manda en el alta (DEFAULT 'operativo')
  kilometrajeInicial?: number
  notasOperativas?: string
}

/**
 * PATCH /api/flota/vehiculos/{vehiculoFlotaId} -> 200 `VehiculoDetalleDto`.
 * Solo los 4 campos operativos de Flota; los canonicos NO se modifican aca y `activo` se mueve por
 * el DELETE (baja logica), no por este PATCH.
 *
 * OJO: para System.Text.Json "campo ausente" y "campo en null" son indistinguibles, asi que omitir
 * `alias` tambien lo borra. Es un drift reportado en f-03/f-04 y lo decide el PO; el front manda
 * siempre el objeto completo que quiere dejar.
 */
export interface ActualizarVehiculoRequest {
  alias?: string | null // null explicito = borrar el apodo
  estadoOperativo?: EstadoOperativoVehiculo // `baja_operativa` -> 409 flota.vehiculo.transicion_invalida
  kilometrajeActual?: number
  notasOperativas?: string
}

/**
 * Campos ordenables de `GET /api/flota/vehiculos`. Default: `FechaCreacion` desc.
 * El estado de conexion NO entra: es compuesto desde Telemetria y no es ordenable server-side.
 */
export type VehiculoSortBy = 'FechaCreacion' | 'Patente'

/**
 * Query del listado.
 *
 * DRIFT: `api.md` §Vehiculos documenta ademas los filtros `estado` (conexion) y `situacion`
 * (con/sin GPS, con/sin conductor). `VehiculosPageQuery` del backend NO los declara, porque no
 * tienen fuente hasta los slices 03/04/05. Declararlos aca seria ofrecer un filtro que no filtra.
 */
export interface VehiculosPageQuery extends SortedPageQuery<VehiculoSortBy> {
  patente?: string // busqueda parcial, case-insensitive
  tipo?: string // codigo de catalogo, match exacto
  soloActivos?: boolean // default true en el backend
}

/**
 * GET /api/flota/vehiculos/{id}/recorridos -> ⚠ DEGRADADO.
 * Hoy responde SIEMPRE 500 con `code: flota.telemetria.no_disponible` (convencion 8b, D-C1):
 * Telemetria no persiste historico de posiciones. El shape se espeja igual para que la firma no
 * cambie cuando exista la fuente. NUNCA 503 — no existe en Flota.
 */
export interface RecorridoDto {
  recorridoId: string
  inicioUtc: string
  finUtc: string | null // null = en curso
  duracionMin: number
  distanciaKm: number
  velocidadMaxKmh: number
  velocidadPromedioKmh: number
  paradasCount: number
  vehiculoFlotaId: string
  patente: string
}

export interface RecorridosQuery extends PageQuery {
  desde?: string // ISO 8601
  hasta?: string // ISO 8601
}

/* ============================================================================
 * 4. CATALOGO CANONICO DE VEHICULOS — NO es de Flota
 *
 * Flota NO sirve marcas ni tipos: son CANONICOS (Decision B) y viven en
 * `plataforma_canonica`. La superficie es `GET /api/plataforma-canonica/catalogo/*`.
 * Fuente de estos shapes: `PlataformaCanonica.Application/DTOs/CatalogoVehiculosDtos.cs`
 * (diseno en `src/PlataformaCanonica/docs/04-catalogo-vehiculos.md`).
 *
 * DRIFT: `api.md` de Flota todavia lista `GET /api/flota/catalogos/{marcas,tipos-vehiculo}`
 * devolviendo `CatalogoItemDto = { codigo, etiqueta }`. Esos endpoints NO existen en `Flota.Api`, y
 * el shape real del canonico es `{ id, codigo, nombre }`. Se espeja el real, con nombre propio para
 * que no se confunda con el `CatalogoItemDto` derogado de Flota.
 *
 * OJO: las 4 tablas grandes del catalogo (marcas/modelos/fabricaciones/versiones) estan VACIAS
 * hasta que se decida la fuente de datos (DA-CAT-02). El select de Marca puede venir vacio: se
 * muestra su empty HONESTO, nunca una lista inventada.
 * ========================================================================== */

export interface CatalogoPageQuery extends PageQuery {
  q?: string // texto libre; filtra el nivel pedido
}

/** Forma comun de los 4 catalogos chicos (tipo de vehiculo, combustible, transmision, carroceria). */
export interface CatalogoCanonicoItemDto {
  id: string // uuid
  codigo: string // snake_case (D-7) — es el valor que viaja al backend
  nombre: string // etiqueta base; la UI la traduce por i18n si tiene clave
}

/** Paso 1 de la cascada: `GET /catalogo/marcas?q=` -> `PagedResult<MarcaCatalogoDto>`. */
export interface MarcaCatalogoDto {
  id: string
  nombre: string
}

/**
 * El atajo transversal: `GET /catalogo/buscar?q=focus 2020 se` -> versiones con el camino completo
 * ya resuelto. `etiqueta` la compone el backend ("Ford Focus 2020 2.0 SE Plus AT").
 */
export interface VersionCaminoCompletoDto {
  versionId: string
  versionNombre: string
  codigoInfoauto: string | null
  fabricacionId: string
  anio: number
  modeloId: string
  modeloNombre: string
  marcaId: string
  marcaNombre: string
  tipoVehiculoId: string | null
  tipoVehiculoCodigo: string | null
  tipoVehiculoNombre: string | null
  combustibleNombre: string | null
  transmisionNombre: string | null
  carroceriaNombre: string | null
  precioReferencia: number | null
  moneda: string | null
  etiqueta: string
}
