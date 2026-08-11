/**
 * Espejo del contrato de Flota — slice-02 (vehiculos) + slice-03 (dispositivos GPS, asignacion
 * vehiculo<->dispositivo y catalogos growables).
 *
 * FUENTE UNICA: `TracAutoV2/src/Flota/docs/00-contrato/dtos.ts` + `api.md`. Redefinir un shape aca
 * esta prohibido: si falta un campo, se corrige el contrato del backend, no este archivo.
 *
 * Este archivo solo espeja lo que USAN los slices construidos. Los shapes de conductores, geozonas,
 * problemas, integraciones y mapa quedan fuera a proposito: llegan con sus slices.
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

/** Los vocabularios de dispositivos (`EstadoStockDispositivo`, `FiltroAsignacionDispositivo`) viven en §5. */

export type RolAsignacionConductor = 'principal' | 'secundario'

/* ============================================================================
 * 3. VEHICULOS
 * ========================================================================== */

export interface VehiculoDispositivoAsignadoDto {
  dispositivoFlotaId: string
  // DRIFT: el backend lo declara `string` no-nulable, pero la COLUMNA es `alias text NULL`
  // (D-S3-12) y el DTO no lo coalesce. Se espeja como nullable para que la UI no tenga que confiar
  // en una no-nulabilidad que la base no garantiza: el fallback es el IMEI, que siempre esta.
  alias: string | null // alias operativo
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
  /**
   * ⚠️ HOY VIENE SIEMPRE `null`, TAMBIEN CON UN GPS INSTALADO — no es "null si no tiene".
   *
   * `VehiculoFlotaService.MapearItem` lo hardcodea (`Dispositivo = null`) y `MapearDetalle` se apoya
   * en ese mismo mapper, asi que el detalle lo hereda; `DispositivoAsignadoDto` no se construye en
   * NINGUN punto de la solucion. Componer el GPS instalado del lado del vehiculo es alcance de
   * slice-05, igual que `conexion` / `ultimaSenal` — el backend lo declara asi en el propio mapper.
   *
   * Consecuencia para la UI, y por eso esta escrito aca y no en un comentario suelto: toda rama
   * `vehiculo.dispositivo !== null` es CODIGO MUERTO hasta slice-05. El tab "Dispositivo GPS" del
   * vehiculo se queda en su vacio incluso justo despues de asignar con exito (la relacion SI se
   * persiste y SI se ve del lado del dispositivo). No es un bug del front: el DTO viene vacio.
   */
  dispositivo: VehiculoDispositivoAsignadoDto | null
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

/* ============================================================================
 * 5. DISPOSITIVOS GPS — slice-03
 *
 * Espejo de `dtos.ts` §5, RECONCILIADO contra el contrato del 2026-08-11 (D-S3-5 … D-S3-35) y
 * contra `Flota.Application/DTOs/DispositivoDtos.cs`, que es el codigo que corre.
 *
 * Lo que NO se espeja, y por que — ninguna de estas ausencias es un olvido:
 *  - `DispositivoTelemetriaSnapshotDto` (`GET .../telemetria`): la fila existe en `api.md` pero el
 *    endpoint NO esta implementado (`ESTADO.md` §"Superficie sin implementar": 12 filas, 11
 *    implementadas). Es de slice-05. Un tipo para una llamada que hoy da 404 de routing es ruido.
 *  - `ConfiguracionDispositivoDto` / `ActualizarConfiguracionDispositivoRequest`: sus 2 endpoints
 *    fueron DEROGADOS de `api.md` (D-S3-22). No son "todavia no implementados": no estan
 *    contratados, y `MatrizEndpointPermisoTests` ancla su ausencia.
 *  - `QrInstalacionDto`: NUNCA existio. Su endpoint tambien se derogo (D-S3-23).
 *  - `ComandoDispositivoRequest`: el endpoint esta BLOQUEADO (B-12) y responde siempre 500
 *    `flota.telemetria.no_disponible`.
 *  - `EventoDispositivoDto`: superficie ⚠ DEGRADADA (A-1), siempre 500 con el mismo code.
 * ========================================================================== */

/**
 * Catalogo `flota.estados_stock_dispositivo_flota` (`datos.md` §3.3). Es el estado de INVENTARIO
 * del dispositivo, NO su conexion: un dispositivo `en_stock` nunca emitio y su `conexion` vale
 * `sin_dato`. Lifecycle: `en_stock -> instalado`; `instalado`/`en_stock` -> `en_reparacion` ->
 * `en_stock`; cualquiera -> `dado_de_baja`, que es **TERMINAL** (no vuelve a `instalado`).
 * `instalado` se alcanza SOLO via asignacion a un vehiculo, nunca por cambio de stock directo.
 */
export type EstadoStockDispositivo = 'en_stock' | 'instalado' | 'en_reparacion' | 'dado_de_baja'

/**
 * Filtro `asignacion` de `GET /api/flota/dispositivos` (D-C8). `sin_asignar` NO es un estado de
 * conexion: se deriva de `vehiculoInstalado === null`. `conexion` y `asignacion` son ortogonales.
 */
export type FiltroAsignacionDispositivo = 'asignado' | 'sin_asignar'

export interface DispositivoVehiculoInstaladoDto {
  vehiculoFlotaId: string
  // DRIFT: `dtos.ts` la declara no-nulable; el backend la sirve `string?` porque sale de la
  // proyeccion canonica del vehiculo, que puede no estar vigente. Mismo criterio que §3.
  patente: string | null
}

export interface DispositivoListItemDto {
  id: string // flota.dispositivos_flota.id — el `dispositivoId` de la API
  // D-S3-12: NULL si la fila no esta sincronizada con el canonico (ddl.sql §2.3). Era `string`.
  dispositivoCanonicoId: string | null
  // D-S3-12 + D-S3-34: `alias text NULL` y SIN indice unico. El comentario "unico en la org" que
  // estaba aca era falso: hoy dos dispositivos con el mismo alias dan 201 los dos. La unicidad es
  // la decision abierta B-15 del PO; hasta que se cierre, `flota.dispositivo.alias_duplicado` NO
  // TIENE EMISOR y la UI no debe prometerla.
  alias: string | null
  imei: string // columna PROPIA de Flota, NO proyeccion canonica (datos.md §6.3)
  // B-18: `modelo` dejo de ser texto libre. Es FK al catalogo growable
  // `flota.modelos_dispositivo_flota`; el DTO expone id + nombre denormalizado.
  modeloId: string | null
  modeloNombre: string | null
  estadoOperativo: EstadoStockDispositivo // el estado de STOCK (el nombre del campo es del contrato)
  vehiculoInstalado: DispositivoVehiculoInstaladoDto | null // null si no esta instalado
  // Estado de CONEXION compuesto desde Telemetria. Partial-data (D-C1 a): `sin_dato` cuando
  // Telemetria no responde, sin flag nuevo en el DTO. NO se persiste en Flota (DA-DL-02).
  conexion: EstadoConexion
  // D-S3-27: NO se persiste (la columna se borro con migracion porque no tenia ningun escritor).
  // Se compone al LEER desde Telemetria, que llega en slice-05: hasta entonces viaja SIEMPRE `null`
  // y eso ES el comportamiento contratado (200 partial-data), no un bug.
  ultimaSenal: string | null
  // `fechaAltaOperativa` NO esta aca a proposito (D-S3-26): en el listado seria un join por pagina.
  // Vive solo en `DispositivoDetalleDto`.
  activo: boolean
}

export interface DispositivoAsignacionHistoricaDto {
  vehiculoFlotaId: string
  // DRIFT: `dtos.ts` la declara no-nulable; el backend la sirve `string?`
  // (`AsignacionHistoricaDispositivoDto(Guid, string? Patente, …)`) porque sale de la proyeccion
  // canonica del vehiculo, que puede no estar vigente. Mismo caso que `DispositivoVehiculoInstalado`
  // §, que si tenia la nota. Quien construya la tabla de historial de asignaciones: `patente ?? id`,
  // nunca `{patente}` crudo.
  patente: string | null
  fechaAsignacion: string
  fechaDesasignacion: string | null // null = asignacion VIGENTE
}

export interface DispositivoDetalleDto extends DispositivoListItemDto {
  // D-S3-25: se DERIVA de `modelos_dispositivo_flota.fabricante` con el mismo join del que sale
  // `modeloNombre`. Dejo de ser proyeccion canonica (eran dos verdades del mismo dato). `null`
  // cuando el alta no eligio modelo (D-S3-5) o cuando la fila del catalogo no declara fabricante.
  fabricante: string | null
  // D-S3-24: columna PROPIA `dispositivos_flota.numero_serie`, capturada en el alta. Dejo de ser
  // proyeccion canonica: el canonico NO tiene esa columna, asi que proyectarla contrataba un `null`
  // permanente.
  numeroSerie: string | null
  // D-S3-26: "ingreso al stock", repuesto desde la transicion INICIAL de stock. SOLO en el detalle.
  // `null` unicamente si la fila no tiene transicion inicial (sembrada fuera de la API).
  // NO es `fechaCreacion`: con alta -> baja -> alta las dos fechas divergen.
  fechaAltaOperativa: string | null
  // Operativos de la SIM. B-18: `proveedorSim` es FK al catalogo `flota.proveedores_sim_flota`,
  // expuesto como id + nombre denormalizado.
  numeroSim: string | null
  proveedorSimId: string | null
  proveedorSimNombre: string | null
  // READ-ONLY en la API: ningun Request la escribe (OTA/firmware es fase 2). D-S3-35: es una columna
  // persistida SIN NINGUN ESCRITOR — hoy vale `null` siempre. Su conservacion es la decision abierta
  // B-16 del PO.
  firmwareVersion: string | null
  // `costoAdquisicionUsd` y `ubicacionDeposito` SE BORRARON del contrato (D-S3-12): no existen las
  // columnas ni en `datos.md` §3.3 ni en `ddl.sql` §2.3. Eran escribibles en el POST y el PATCH y
  // System.Text.Json los DESCARTABA en silencio — el cliente mandaba, recibia 200 y el dato se
  // perdia sin un solo error. Si el negocio los quiere, es migracion + columnas, no campo de DTO.
  notasOperativas: string | null
  historialAsignaciones: DispositivoAsignacionHistoricaDto[]
  fechaCreacion: string
  fechaActualizacion: string
  creadoPorUsuarioId: string | null
  modificadoPorUsuarioId: string | null
  creadoPorNombre: string | null // proyeccion usuario->persona
  modificadoPorNombre: string | null // idem
}

/**
 * POST /api/flota/dispositivos -> 201 `DispositivoDetalleDto`.
 *
 * SOLO MODO A (IMEI que ya existe en el canonico). `dispositivoNuevo` (Modo B) NO se espeja aunque
 * `dtos.ts` lo declare: `plataforma_canonica.dispositivos` exige un `traccar_device_id` que NADA en
 * la solucion genera (B-7), asi que el backend rechaza SIEMPRE con 400
 * `flota.dispositivo.alta_modo_b_no_soportado`. Tipar un campo cuyo unico desenlace es un 400 es
 * invitar a cablear un formulario que no puede guardar.
 *
 * `imei` es REQUERIDO (D-S3-32) y es lo que el usuario tipea: esta impreso en el equipo que tiene en
 * la mano. Hasta esa decision `dtos.ts` no lo declaraba y un front tipado desde el contrato recibia
 * 400 en TODAS las altas.
 *
 * `modeloId` es OPCIONAL desde D-S3-5 (DA-DL-09 lo declaraba requerido). Cuando viaja, sale del
 * catalogo growable — nunca texto libre, nunca hardcodeado (B-18).
 */
export interface RegistrarDispositivoRequest {
  imei: string // REQUERIDO (D-S3-32)
  // Opcional: si viene, tiene que coincidir con el canonico que resuelve el IMEI; si no coincide,
  // 404 `flota.dispositivo.canonico_no_existe`.
  dispositivoCanonicoId?: string
  alias: string
  modeloId?: string // uuid del catalogo growable; 404 `flota.dispositivo.modelo_no_existe`
  numeroSerie?: string // D-S3-24: dato propio de Flota, capturado aca. Read-only despues del alta.
  numeroSim?: string
  proveedorSimId?: string // uuid del catalogo; 404 `flota.dispositivo.proveedor_sim_no_existe`
  notasOperativas?: string
}

/**
 * PATCH /api/flota/dispositivos/{dispositivoId} -> 200 `DispositivoDetalleDto`.
 * `imei` y `numeroSerie` son READ-ONLY despues del alta: el contrato no los expone aca.
 *
 * MISMA TRAMPA que el PATCH de vehiculos: para `System.Text.Json` "campo ausente" y "campo en null"
 * son indistinguibles, asi que omitir un campo tambien puede borrarlo segun como lo resuelva el
 * service. El front manda siempre el objeto completo que quiere dejar.
 */
export interface ActualizarDispositivoRequest {
  alias?: string
  modeloId?: string // uuid del catalogo (B-18)
  numeroSim?: string
  proveedorSimId?: string | null // null explicito = desvincular
  notasOperativas?: string
}

/**
 * POST /api/flota/dispositivos/{dispositivoId}/estado-stock -> 200 `DispositivoDetalleDto`.
 *
 * DOS destinos excluidos POR TIPO, y los dos por razones distintas:
 *  - `instalado`: se alcanza SOLO asignando el dispositivo a un vehiculo (DA-DL-05).
 *  - `dado_de_baja`: se alcanza SOLO por `POST .../baja` (D-S3-9). Este endpoint esta gateado por
 *    `flota.dispositivos.gestionar-stock` (que supervisor tiene) y la baja por
 *    `flota.dispositivos.eliminar` (que supervisor NO tiene): admitirlo aca ejecutaba la baja con
 *    el permiso equivocado y el efecto era identico.
 *
 * Un selector que ofrezca cualquiera de los dos esta ofreciendo una operacion que el backend
 * RECHAZA con 409 `flota.dispositivo.transicion_stock_invalida`.
 */
export interface CambiarEstadoStockRequest {
  estadoNuevo: Exclude<EstadoStockDispositivo, 'instalado' | 'dado_de_baja'>
  motivo?: string
}

/**
 * GET /api/flota/dispositivos/{dispositivoId}/historial-stock ->
 * `PagedResult<TransicionStockDto>` (ORDER BY fechaUtc DESC, transicionId).
 *
 * ⚠️ ESTA IMPLEMENTADO. El comentario que circulaba ("no hay tabla en el contrato de datos") quedo
 * viejo: la tabla es `transiciones_stock_dispositivo_flota` y existe desde la migracion
 * `Agregado_DispositivoGps_Y_Asignacion`.
 */
export interface TransicionStockDto {
  transicionId: string
  estadoAnterior: EstadoStockDispositivo | null // null = transicion inicial del alta
  estadoNuevo: EstadoStockDispositivo
  motivo: string | null
  fechaUtc: string // ISO 8601
  usuarioId: string | null
  usuarioNombre: string | null
}

/**
 * Campos ordenables de `GET /api/flota/dispositivos`. Default: `FechaCreacion` desc.
 * `conexion` es compuesto desde Telemetria: filtrable, NO ordenable server-side.
 */
export type DispositivoSortBy = 'Imei' | 'FechaCreacion'

/**
 * Query del listado.
 *
 * DRIFT DECLARADO (D-S3-33): `api.md` documenta 5 filtros y el server solo DECLARA 4. `conexion`
 * NO se espeja: es compuesto de Telemetria, no tiene fuente (B-9) y `DispositivosPageQuery` del
 * backend no lo declara — un query param que el server no declara lo descarta el binder SIN ERROR,
 * asi que el cliente lo manda y recibe 200 con la lista ENTERA sin filtrar. Es el modo de falla que
 * este mismo listado ya sufrio con `modelo`. El chip de Conexion no se dibuja hasta slice-05.
 */
export interface DispositivosPageQuery extends SortedPageQuery<DispositivoSortBy> {
  /** ✅ implementado (D-S3-33). `EXISTS` sobre la asignacion con periodo abierto; NO es `stock=instalado`. */
  asignacion?: FiltroAsignacionDispositivo
  stock?: EstadoStockDispositivo
  /** El VALOR es el uuid del catalogo growable (B-18), no el nombre del modelo. */
  modelo?: string
  soloActivos?: boolean
}

/** Query de `GET .../historial-stock`. Solo paginacion: el contrato no declara filtros. */
export type HistorialStockQuery = PageQuery

/* ============================================================================
 * 6. ASIGNACIONES vehiculo<->dispositivo — `api.md` §Asignaciones (bajo vehiculo)
 *
 * Las 2 filas de dispositivo estan IMPLEMENTADAS (2026-08-10, P2 resuelto por el PO). Las 2 de
 * conductor son de slice-04 y no se espejan.
 *
 * El `POST` COORDINA CON PLATAFORMACANONICA ANTES DE PERSISTIR (D-S3-13): la correlacion
 * dispositivo->vehiculo la posee el Canonico y es lo que hace que Telemetria acepte las posiciones.
 * Si la coordinacion falla, el endpoint FALLA y no queda nada escrito — nunca 200 con la mitad hecha.
 * ========================================================================== */

/**
 * Codigos del catalogo `motivos_cierre_asignacion_flota` (`ddl.sql` §1). NO es texto libre: el
 * dominio rechaza cualquier valor fuera del catalogo.
 */
export type MotivoCierreAsignacion = 'reasignacion' | 'reparacion' | 'baja' | 'otro'

/**
 * POST /api/flota/vehiculos/{vehiculoFlotaId}/asignaciones/dispositivo -> 200
 * `AsignacionVehiculoDispositivoDto`.
 *
 * `dtos.ts` declara ademas `vehiculoFlotaId` (duplicado de la URL) y `fechaInicio`. NINGUNO de los
 * dos se implementa (D-S3-16) porque el contrato no tiene `code` con el que rechazar sus casos
 * borde: "el body dice otro vehiculo que la URL" y "fechaInicio fuera de rango" no tienen fila en
 * `errores.md`. Mandarlos no hace nada; declararlos aca haria creer que si.
 */
export interface AsignarDispositivoRequest {
  dispositivoFlotaId: string // id LOCAL de Flota, no el canonico
}

/**
 * Body OPCIONAL del
 * DELETE /api/flota/vehiculos/{vehiculoFlotaId}/asignaciones/dispositivo/{asignacionId} -> 204.
 * Sin body, el motivo de cierre es `otro` (D-S3-15).
 */
export interface DesasignarDispositivoRequest {
  motivo?: MotivoCierreAsignacion
}

/**
 * Respuesta del `POST`.
 *
 * ⚠️ SHAPE NO DEFINIDO EN `dtos.ts` — PENDIENTE (D-S3-16), ratificable por el PO. Se espeja el que
 * sirve el backend. Es la UNICA fuente del `asignacionId`: `GET /vehiculos/{id}/asignaciones` NO
 * esta implementado y los items de `historialAsignaciones` tampoco lo llevan, asi que un cliente que
 * pierde esta respuesta NO PUEDE desasignar.
 */
export interface AsignacionVehiculoDispositivoDto {
  asignacionId: string
  vehiculoFlotaId: string // id LOCAL (A-4); la fila persiste el canonico y el service traduce
  dispositivoFlotaId: string
  fechaAsignacion: string // ISO 8601
  fechaDesasignacion: string | null // null = vigente
  motivoCierre: MotivoCierreAsignacion | null // solo al cerrar
}

/* ============================================================================
 * 7. CATALOGOS GROWABLES DEL DISPOSITIVO — `api.md` §Catalogos para selects (b)
 *
 * Modelos de GPS y proveedores de SIM: `GET` (globales + de la org) + `POST` (alta por organizacion).
 * Existen desde D-S3-20/21 y son la FUENTE de los selects del alta y la edicion de dispositivo:
 * nada hardcodeado en UI (DA-DD-02 / DA-DL-03).
 *
 * NO usan `CatalogoItemDto` (`{codigo, etiqueta}`) ni `CatalogoCanonicoItemDto`: estas dos tablas no
 * tienen columna `codigo`, su clave es un `id uuid` (D-8 / B-18) y los request de dispositivo
 * referencian `modeloId` / `proveedorSimId`.
 *
 * NINGUNO PAGINA: son acotados por definicion y devuelven un array plano, no `PagedResult<T>`. Es la
 * unica familia de listados del modulo exenta de la convencion 3, y lo esta por contrato.
 * ========================================================================== */

export interface CatalogoGrowableItemDto {
  id: string // uuid — es el valor que viaja en `modeloId` / `proveedorSimId`
  nombre: string
  /** Solo `modelos_dispositivo_flota` lo tiene; en proveedores de SIM viaja SIEMPRE `null`. */
  fabricante: string | null
  /** `true` = fila sembrada por la plataforma. La UI la necesita para no ofrecer editarla. */
  esGlobal: boolean
}

/**
 * POST /api/flota/catalogos/modelos-dispositivo -> 201 `CatalogoGrowableItemDto`.
 *
 * NO lleva `organizacionId` ni `esGlobal`: el tenant sale del JWT y la fila nace SIEMPRE con la
 * organizacion que llama. Si el request pudiera pedir "global", el endpoint seria una escalada de
 * privilegio con forma de campo opcional.
 *
 * Nombre repetido DENTRO de la organizacion -> 409 `flota.catalogo.nombre_duplicado`
 * (`args {catalogo, nombre}`). Repetir el nombre de una fila GLOBAL es legal y NO emite ese code
 * (B-14, ratificacion abierta del PO): el select puede mostrar 2 entradas homonimas.
 */
export interface CrearModeloDispositivoRequest {
  nombre: string
  fabricante?: string
}

/** POST /api/flota/catalogos/proveedores-sim. Igual, SIN `fabricante`: la tabla no tiene esa columna. */
export interface CrearProveedorSimRequest {
  nombre: string
}
