/**
 * Espejo del contrato de Flota — slice-02 (vehiculos) + slice-03 (dispositivos GPS, asignacion
 * vehiculo<->dispositivo y catalogos growables) + slice-04 (conductores operativos, vinculo
 * conductor<->dispositivo, documentos y asignacion vehiculo<->conductor) + slice-05 (composicion
 * con Telemetria: estado de conexion y ultima senal REALES en los 2 listados, filtros compuestos,
 * snapshot tecnico del dispositivo y mapa en vivo).
 *
 * FUENTE UNICA: `TracAutoV2/src/Flota/docs/00-contrato/dtos.ts` + `api.md`. Redefinir un shape aca
 * esta prohibido: si falta un campo, se corrige el contrato del backend, no este archivo.
 *
 * Este archivo solo espeja lo que USAN los slices construidos. Los shapes de geozonas, problemas e
 * integraciones quedan fuera a proposito: llegan con sus slices. El mapa entra en §9 porque su
 * backend se construyo en slice-05 `f-04` (`MapaController`, 2 endpoints).
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * DRIFT CONTRATO ↔ BACKEND REAL (verificado contra
 * `TracAutoV2/src/Flota/Flota.Application/DTOs/{Vehiculo,Dispositivo,Mapa}Dtos.cs`, que es el
 * codigo que corre). Regla: cuando `dtos.ts` es mas ESTRICTO que la fuente, manda el server y el
 * drift se DECLARA aca — nunca se inventa un valor para cumplir el tipo.
 *
 * 1. `dtos.ts` declara `patente`, `marca`, `modelo`, `anio` y `tipo` como NO nulables. El backend
 *    los declara nullable a proposito (`string?` / `int?`), porque salen de la proyeccion local del
 *    canonico y esa proyeccion puede no estar vigente. Tiparlos no-nulos aca no arregla el dato:
 *    solo mueve la explosion de la capa de red al `.toUpperCase()` de una celda de tabla.
 * 2. `pagination.fromItem` / `toItem`: `dtos.ts` dice `number`, `Platform.Pagination` los emite
 *    `long?` y valen `null` cuando la pagina viene vacia.
 * 3. `ignicion` (en `UltimaSenalDto`, `MapaItemDto` y `VehiculoEnVivoDto`): `dtos.ts` dice
 *    `boolean` y upstream es `bool?`. El backend lo sirve NULLABLE: mandar `false` sin dato
 *    afirmaria "motor apagado", un hecho que Flota no verifico.
 * 4. `ubicacion.direccionGrados` (rumbo) y `alertasActivasCount` del mapa: `dtos.ts` los tipa
 *    `number` no-nulable y el backend los sirve SIEMPRE `null` (B-33, sin fuente batch). La
 *    alternativa era `0`, que significa "al norte" y "sin alertas".
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
 * Estado de CONEXION (derivado, compuesto por Flota desde Telemetria). ✅ Se compone DE VERDAD
 * desde slice-05 `f-03` (2026-08-12): el mapeo cerrado vive en `fronteras/telemetria.md` §3 y es
 * `online -> en_linea` · `offline -> desconectado` · `unknown -> sin_dato`.
 *
 * ⚠️ `sin_dato` NO ES `desconectado`, y confundirlos es el error mas caro de este slice:
 *  - `desconectado` es una AFIRMACION del upstream: el equipo reportaba y dejo de hacerlo (umbral
 *    de 5 min, lo decide Telemetria; Flota no recalcula offline).
 *  - `sin_dato` es una AUSENCIA: no hay fila upstream para ese vehiculo/dispositivo. Un GPS
 *    `en_stock` nunca aparece en la fuente batch, asi que su conexion es `sin_dato` POR AUSENCIA —
 *    no esta apagado ni fallado. Y si Telemetria no responde, TODOS quedan en `sin_dato`: eso es
 *    partial-data (D-C1 a), no "toda la flota desconectada".
 * Pintarlos igual manda a un operador a llamar al proveedor de GPS por una flota que esta bien.
 *
 * ⚠️ `incompleto` NO SE EMITE NUNCA hoy (B-31, abierta): el contrato lo define dos veces y
 * distinto — `fronteras/telemetria.md` §3 dice "vehiculo sin dispositivo asignado" y `datos.md`
 * §2.1 dice "sin GPS **o** sin conductor" — y el backend paro en vez de elegir. Un vehiculo sin GPS
 * cae hoy en `sin_dato`. El valor queda en el tipo porque el vocabulario es cerrado y el filtro lo
 * acepta (devolviendo lista vacia), pero NINGUNA pantalla debe ofrecerlo como opcion de filtro
 * mientras B-31 siga abierta: ver `VALORES_FILTRO_CONEXION` en
 * `modules/flota/vocabulario-conexion.ts`.
 */
export type EstadoConexion = 'en_linea' | 'desconectado' | 'incompleto' | 'sin_dato'

/**
 * Vocabulario cerrado del filtro `situacion` de `GET /api/flota/vehiculos` (`api.md` §Vehiculos).
 * ✅ implementado en slice-05 `f-02` con los 4 valores: son `EXISTS`/`NOT EXISTS` INTRA-SCHEMA
 * sobre las tablas de asignacion (periodo abierto), asi que **no dependen de Telemetria** y no se
 * caen con ella.
 *
 * Es un TERCER eje, ortogonal a los otros dos y no colapsable con ninguno: `situacion` dice que
 * recursos tiene atados el vehiculo, `estado` (`EstadoConexion`) dice si el GPS reporta y
 * `estadoOperativo` dice si la organizacion lo tiene operativo.
 *
 * `con_conductor` cuenta CUALQUIER asignacion vigente, no solo la del principal (`datos.md` §4
 * admite secundarios y turnos).
 *
 * ⚠️ NOMBRE SIN DUENIO EN `dtos.ts`. Los 4 valores son transcripcion exacta de `api.md` §Vehiculos
 * y de `FiltrosSituacionVehiculo` del backend, pero `dtos.ts` —que es el dueño de los shapes— NO
 * declara un tipo con nombre para este vocabulario (a diferencia de `EstadoConexion`, que si esta
 * en `dtos.ts:82`). O sea: los VALORES son contrato, el NOMBRE del alias es de este archivo. Si el
 * PO le da nombre en `dtos.ts`, se renombra aca y no cambia ningun valor. PENDIENTE: PO + `dtos.ts`.
 */
export type SituacionVehiculo =
  | 'con_dispositivo_gps'
  | 'sin_dispositivo_gps'
  | 'con_conductor'
  | 'sin_conductor'

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

/**
 * ⚠️ MISMA FILA 🔴 QUE `dispositivo`, verificada al cerrar el backend de slice-04:
 * `VehiculoFlotaService.MapearItem` escribe `ConductorPrincipal = null` y `ConductoresCount = 0`, y
 * `MapearDetalle` escribe `ConductoresAsignados = []`, en el **100% de las respuestas** — tambien
 * cuando el vehiculo SI tiene conductores asignados. La tabla
 * `asignaciones_vehiculo_conductor_flota` existe desde la migracion `Conductores`, asi que es
 * COMPOSICION faltante, no dato faltante (`ESTADO.md` §"Superficie sin implementar").
 *
 * Consecuencia para la UI: es PARTIAL-DATA, no "no tiene conductor". Ninguna pantalla puede afirmar
 * "este vehiculo no tiene conductor" leyendo estos 3 campos, porque Flota todavia no lo sabe.
 */

/**
 * Ultima senal recibida, compuesta desde `vehiculos/estado` de Telemetria — la MISMA llamada que
 * trae `estado` (1 request upstream por listado, C-17). `null` en el item = no hay fila upstream:
 * el vehiculo nunca reporto, no tiene GPS instalado, o Telemetria no respondio (partial-data).
 */
export interface UltimaSenalDto {
  fechaUtc: string // ISO 8601 — instante del reporte EN EL DISPOSITIVO
  velocidadKmH: number
  // DRIFT 3 del encabezado: `dtos.ts` dice `boolean`, upstream es `bool?` y el backend lo sirve
  // nullable. `null` = el equipo no reporto ignicion; NO es "motor apagado".
  ignicion: boolean | null
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
   * NINGUN punto de la solucion.
   *
   * ⚠️ DUENIO ACTUALIZADO (2026-08-13). Este bloque decia "componerlo es alcance de slice-05, igual
   * que `conexion` / `ultimaSenal`". Esos 2 SI se compusieron (`f-03`), pero **este no**: es
   * composicion INTRA-SCHEMA (la tabla de asignaciones existe desde slice-03) y el backend de
   * slice-05 cerro el 2026-08-12 sin tomarla. `ESTADO.md` §"Superficie sin implementar" deja el
   * dueño en "PO / `f-05` de slice-04". O sea que la espera **no** termina con este slice.
   *
   * Consecuencia para la UI, y por eso esta escrito aca y no en un comentario suelto: toda rama
   * `vehiculo.dispositivo !== null` es INALCANZABLE hasta que alguien componga el campo. El tab
   * "Dispositivo GPS" del vehiculo se queda en su vacio incluso justo despues de asignar con exito
   * (la relacion SI se persiste y SI se ve del lado del dispositivo). No es un bug del front: el DTO
   * viene vacio.
   */
  dispositivo: VehiculoDispositivoAsignadoDto | null
  /** ⚠️ HOY VIENE SIEMPRE `null` — ver el bloque de `VehiculoConductorPrincipalDto`. Partial-data. */
  conductorPrincipal: VehiculoConductorPrincipalDto | null
  /** ⚠️ HOY VIENE SIEMPRE `0`, tambien con conductores asignados. Partial-data, no "no tiene". */
  conductoresCount: number
  estadoOperativo: EstadoOperativoVehiculo
  /**
   * Estado de CONEXION, ✅ compuesto DE VERDAD desde slice-05 `f-03` (antes venia siempre
   * `sin_dato`). Partial-data (D-C1 a): si Telemetria no responde vale `sin_dato` y los datos
   * propios se sirven igual, sin flag nuevo en el DTO — la ausencia se lee por el valor.
   *
   * ⚠️ NO es `estadoOperativo` (catalogo persistido de Flota) ni `activo` (baja logica): tres ejes
   * distintos que no se colapsan. Y `sin_dato` !== `desconectado` — ver `EstadoConexion` en §2.
   */
  estado: EstadoConexion
  /** ✅ Poblada desde slice-05 `f-03`. `null` = sin fila upstream (nunca emitio, o partial-data). */
  ultimaSenal: UltimaSenalDto | null
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
  /** ⚠️ HOY VIENE SIEMPRE `[]` — ver el bloque de `VehiculoConductorPrincipalDto`. Partial-data. */
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
 * Query del listado. Los 5 filtros que `api.md` §Vehiculos contrata estan declarados por el server
 * y filtran de verdad (tabla de estado fila por fila en `api.md`, D-S3-33): ninguno se acepta para
 * ignorarlo.
 *
 * ⚠️ `estado` y `situacion` se resuelven DISTINTO, y conviene saberlo antes de dibujar los chips:
 *  - `situacion` es `EXISTS` intra-schema, resuelto en SQL. No depende de Telemetria.
 *  - `estado` es COMPUESTO desde Telemetria: el service trae candidatos, compone, filtra y recien
 *    ahi pagina (asi `totalItems` no miente). Por eso NO es ordenable (convencion 3), y por eso
 *    con Telemetria caida todo vale `sin_dato` y `estado=en_linea` devuelve LISTA VACIA. Es la
 *    consecuencia honesta del partial-data, no un filtro roto: el badge de esas mismas filas
 *    tambien dice "Sin dato".
 *
 * Un valor fuera del vocabulario devuelve lista vacia, nunca la lista entera.
 */
export interface VehiculosPageQuery extends SortedPageQuery<VehiculoSortBy> {
  patente?: string // busqueda parcial, case-insensitive
  /**
   * ✅ implementado en slice-05 `f-03`. ⚠️ NO ofrecer `incompleto` en la UI: matchea 0 filas
   * mientras B-31 siga abierta (ninguna capa lo emite). Ver `VALORES_FILTRO_CONEXION`.
   */
  estado?: EstadoConexion
  /** ✅ implementado en slice-05 `f-02`, los 4 valores. */
  situacion?: SituacionVehiculo
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
  /**
   * Estado de CONEXION del EQUIPO, ✅ compuesto desde slice-05 `f-03` indexando la fuente batch por
   * DISPOSITIVO canonico (D-S3-27) — por eso un GPS `en_stock` tambien recibe badge, y ese badge es
   * `sin_dato` POR AUSENCIA (nunca aparecio en la fuente), no porque este apagado. Partial-data
   * (D-C1 a): `sin_dato` tambien cuando Telemetria no responde. NO se persiste en Flota (DA-DL-02).
   */
  conexion: EstadoConexion
  /**
   * D-S3-27: NO se persiste (la columna se borro con migracion porque no tenia ningun escritor).
   * ✅ Se compone al LEER desde Telemetria desde slice-05 `f-03`, en la MISMA llamada que
   * `conexion` (costo cero adicional). `null` = sin fila upstream o Telemetria caida: 200
   * partial-data, no un bug. ISO 8601.
   */
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
 * `GET /api/flota/dispositivos/{dispositivoId}/telemetria` -> 200 `DispositivoTelemetriaSnapshotDto`.
 * Permiso `flota.dispositivos.leer`. ✅ IMPLEMENTADO en slice-05 `f-04` (2026-08-12). Son los datos
 * tecnicos en vivo de la ficha del equipo; el detalle y el snapshot son 2 llamadas distintas a
 * proposito (`api.md`), y el snapshot se sirve por polling igual que el mapa.
 *
 * ⚠️ Es PARTIAL-DATA (convencion 8a), NO una superficie degradada: responde **200 con los campos
 * sin fuente en `null`**, nunca 500. La lista de superficies que dan 500
 * `flota.telemetria.no_disponible` es cerrada y esta NO esta en ella. Una pantalla que trate este
 * endpoint como "sin fuente" y no lo llame se pierde el unico dato tecnico que hoy existe.
 *
 * Que puede venir `null`, y por que — ninguna de las 3 razones es un fallo:
 *  - `uptime`: SIEMPRE `null` (D-S3-28). El % de disponibilidad en 30 dias exige historico de
 *    posiciones, que Telemetria NO persiste (B-9). Deja de ser `null` sin cambiar el contrato.
 *  - `bateriaInterna` / `bateriaVehiculo`: salen de `resumen-tecnico`, que es POR VEHICULO. Un GPS
 *    `en_stock` no tiene de donde sacarlos — y en ese caso el backend ni siquiera pide el resumen.
 *  - `velocidadKmh` / `ultimaSenalUtc`: salen del estado por organizacion indexado por dispositivo,
 *    asi que los tiene incluso un equipo sin vehiculo. `null` = no hay fila upstream.
 *
 * B-6: `senalGsm`, `redMovil`, `satelites` y `hdop` NO EXISTEN en ninguna capa de Telemetria y por
 * eso no estan en este DTO, aunque el mockup los dibuje. No agregarlos "para completar la ficha".
 */
export interface DispositivoTelemetriaSnapshotDto {
  dispositivoFlotaId: string
  uptime: number | null // ⚠️ SIEMPRE null en v1 (D-S3-28)
  bateriaInterna: number | null // % del equipo GPS (0-100)
  bateriaVehiculo: number | null // voltaje/nivel de la bateria del vehiculo
  velocidadKmh: number | null
  ultimaSenalUtc: string | null // ISO 8601
  fechaSnapshotUtc: string // momento de la COMPOSICION en Flota, no el del reporte
}

/**
 * Campos ordenables de `GET /api/flota/dispositivos`. Default: `FechaCreacion` desc.
 * `conexion` es compuesto desde Telemetria: filtrable, NO ordenable server-side.
 */
export type DispositivoSortBy = 'Imei' | 'FechaCreacion'

/**
 * Query del listado. Los **5** filtros de `api.md` §Dispositivos GPS estan declarados por el server
 * y filtran: `conexion` se sumo en slice-05 `f-03` (2026-08-12) y con eso la tabla de estado de
 * `api.md` queda entera en ✅.
 */
export interface DispositivosPageQuery extends SortedPageQuery<DispositivoSortBy> {
  /** ✅ implementado (D-S3-33). `EXISTS` sobre la asignacion con periodo abierto; NO es `stock=instalado`. */
  asignacion?: FiltroAsignacionDispositivo
  stock?: EstadoStockDispositivo
  /**
   * ✅ implementado en slice-05 `f-03`: compuesto desde la misma llamada que alimenta `ultimaSenal`,
   * filtrado ANTES de paginar. Filtrable, NO ordenable.
   *
   * ⚠️ `incompleto` es INALCANZABLE para un dispositivo (B-32): por D-C8 ese codigo significa
   * "vehiculo sin dispositivo", y "dispositivo sin vehiculo" se mudo al filtro `asignacion`. El
   * server lo acepta y devuelve LISTA VACIA. La UI ofrece los otros 3 valores
   * (`VALORES_FILTRO_CONEXION`), no este.
   */
  conexion?: EstadoConexion
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

/* ============================================================================
 * 8. CONDUCTORES OPERATIVOS — slice-04
 *
 * Espejo de `dtos.ts` §4 + §6 + §10, RECONCILIADO contra
 * `Flota.Application/DTOs/{ConductorDtos,AsignacionConductorDtos,DocumentoDtos}.cs`, que es el
 * codigo que corre, y contra `ConductoresController` (17 endpoints).
 *
 * ── POR QUE ESTE ESPEJO TIENE MENOS CAMPOS QUE `dtos.ts` ─────────────────────────────────────
 * `dtos.ts` §4 declara 6 campos de `ConductorDetalleDto` que el backend NO SERIALIZA porque no
 * tienen columna ni fuente canonica accesible: `telefono` (duplica `telefonoPrincipal`),
 * `fechaNacimiento`, `cuil`, `direccion`, `contactoEmergencia` y `geozonasAsignadas` (DIFERIDO
 * DA-08). Tambien declara 3 campos extra dentro de `licencia` (`lugarEmision`, `observaciones`,
 * `fechaUltimaRenovacion`) sin columna fuente.
 *
 * NO se espejan: un campo que el server no manda llega `undefined`, la UI lo pinta vacio y NADA
 * falla — se contrata un `null` permanente disfrazado de dato. Es el mismo criterio con que
 * D-S3-27 borro `ultima_senal_utc`. Drift REPORTADO contra `dtos.ts`; lo cierra el PO.
 *
 * ── LO QUE NO SE ESPEJA DE LA SUPERFICIE (y por que no es un olvido) ─────────────────────────
 *  - Filtro `licencia` (`a|b1|...|e2`) de `GET /conductores`: `api.md` lo contrata y
 *    `ConductoresPageQuery` del backend NO LO DECLARA — la categoria no tiene columna en ninguna
 *    tabla (B-21). Un query param no declarado lo descarta el binder SIN ERROR: el cliente lo manda
 *    y recibe 200 con la lista ENTERA. El chip no se dibuja.
 *  - Param `search`: el contrato no declara busqueda libre en este listado.
 *  - `licencia` y `enviarInvitacion` en `CrearConductorRequest` / `ActualizarConductorRequest`: el
 *    Validator los RECHAZA con 400 (no los descarta en silencio). La licencia se carga por
 *    `POST /conductores/{id}/documentos` con `tipoDocumento: 'licencia'`; el canal de invitacion no
 *    existe (`fronteras/notificaciones.md`: Flota no invoca Notificaciones).
 *  - `ConductorStatsDto` y `RecorridoDto` por conductor: sus 2 endpoints responden SIEMPRE 500
 *    `flota.telemetria.no_disponible` (convencion 8b). El front NO debe emitir el request.
 *  - Infracciones, import y export de conductores: fuera de alcance v1 (0 endpoints).
 * ========================================================================== */

/**
 * Catalogo `flota.estados_conductor_flota`. Es el estado OPERATIVO y es ORTOGONAL a `activo`
 * (DA-CD2-19): `suspendido` es un estado con `activo = true`; `activo = false` es baja logica
 * reversible. El catalogo NO tiene estado terminal.
 *
 * Lifecycle (`datos.md` §3.2): `pendiente_documentacion` -> `disponible` -> `en_servicio`;
 * `en_servicio` <-> `pausado` -> `disponible`; cualquiera -> `suspendido`.
 *
 * ⚠️ `suspendido` NO TIENE SALIDA en v1 (B-22, abierta): el contrato no declara ninguna arista de
 * vuelta y el backend la implementa literal. La unica salida hoy es baja + re-alta. Una UI que
 * ofrezca "rehabilitar" desde `suspendido` esta ofreciendo un 409.
 */
export type EstadoConductor =
  | 'pendiente_documentacion'
  | 'disponible'
  | 'en_servicio'
  | 'pausado'
  | 'suspendido'

/**
 * Estado derivado de un documento adjunto. Se CALCULA al leer (umbral 30 dias, backend f-01), NO se
 * persiste: el front no recalcula el umbral.
 *
 * `dtos.ts` declara ademas un superset SOLO para la licencia (`aprobado` | `por_renovar`,
 * DA-CD2-09). El backend NO los emite en v1 —ningun doc dice cuando aplican, no hay columna de
 * aprobacion ni regla—, asi que no se espejan.
 */
export type EstadoDocumento = 'vigente' | 'por_vencer' | 'vencido' | 'sin_cargar'

/**
 * Codigos del catalogo DB `tipos_documento_conductor_flota` (`ddl.sql` §1.1), en el orden del seed.
 *
 * ⚠️ ES UN CATALOGO DE TABLA SIN ENDPOINT: `api.md` no expone `GET /catalogos/tipos-documento`
 * (PENDIENTE de f-04 paso 7). Hasta que exista, los 6 codigos se usan literales — es lo que f-06
 * paso 6 manda explicitamente. Si una organizacion agrega un tipo, el select no lo va a ver.
 *
 * La obligatoriedad (`es_obligatorio`) NO esta aca: vive en la fila, y lo que la expone es
 * `ConductorDetalleDto.documentosObligatorios`.
 */
export type TipoDocumentoConductor =
  | 'licencia'
  | 'dni'
  | 'psicofisico'
  | 'art'
  | 'defensivo'
  | 'contrato'

/**
 * Vocabulario cerrado del filtro `estado` de `GET /conductores`.
 *
 * ⚠️ NO ES `EstadoConductor`, aunque el parametro se llame igual. `activo`/`inactivo` miran el flag
 * `activo` (baja logica), no el estado operativo — asi que NINGUNO de los 5 codigos del catalogo es
 * un valor valido de este filtro, y no hay valor para `pendiente_documentacion` (PENDIENTE del
 * contrato: la lista cierra en 4). Los otros 2 se derivan del documento de tipo `licencia`.
 *
 * `inactivo` LEVANTA el query filter de `activo` aunque `soloActivos` siga en `true`: sin eso el
 * valor seria inalcanzable por construccion.
 */
export type FiltroEstadoConductor =
  | 'activo'
  | 'inactivo'
  | 'licencia_proxima_a_vencer'
  | 'licencia_vencida'

/**
 * Vocabulario cerrado del filtro `asignacion` de `GET /conductores`.
 *
 * ⚠️ NO se reusa `FiltroAsignacionDispositivo` (`asignado`/`sin_asignar`): el contrato les da
 * vocabularios distintos y el valor viaja LITERAL en el query string. Colapsarlos hace que
 * `?asignacion=con_vehiculo` no filtre.
 */
export type FiltroAsignacionConductor = 'con_vehiculo' | 'sin_vehiculo'

/**
 * Objeto `licencia` del conductor. NO es tabla propia: es la fila de `documentos_conductor_flota`
 * con `tipo_documento = 'licencia'` (`dtos.ts` §4 declara esa fuente).
 *
 * ⚠️ `categoria` VIENE SIEMPRE `null`: no tiene columna en ninguna tabla — es el PENDIENTE ex
 * DA-CD2-08 que `ddl.sql` §2.2 declara BLOQUEANTE (B-21 del PO). Es la misma causa por la que el
 * filtro `licencia` del listado no existe y por la que el alta rechaza el bloque `licencia` con 400.
 * Una celda que pinte la categoria muestra su fallback, no un dato.
 *
 * `diasParaVencer` lo calcula el backend con la MISMA cuenta que `estadoDerivado`; es negativo si ya
 * vencio y `null` si no hay fecha cargada. El front no recalcula el umbral.
 */
export interface LicenciaConductorDto {
  categoria: string | null // ⚠️ SIEMPRE null en v1 (B-21)
  numero: string | null
  vencimiento: string | null // ISO date
  diasParaVencer: number | null // negativo = vencida
  fechaEmision: string | null // ISO date
}

/**
 * Fila del listado de conductores. Es un COMPOSITE de 3 capas: perfil operativo de Flota +
 * proyeccion de identidad canonica + la licencia (que sale de documentos).
 *
 * ⚠️ PARTIAL-DATA ESTRUCTURAL (convencion 8a), no borde: `nombreCompleto`, `dni` y
 * `telefonoPrincipal` salen de `proyeccion_personas_canonicas_flota` y el `find-or-create` del
 * Canonico GATEA LA PII — solo devuelve nombre/apellido/documento si la organizacion que llama ya
 * tenia relacion con esa Persona (`fronteras/plataforma-canonica.md` §5.1). Lo que Flota proyecta es
 * lo que el operador tipeo en el alta; si el conductor nacio por otra via, la proyeccion queda
 * vacia. La UI muestra su fallback y NO afirma que la persona no tiene nombre.
 */
export interface ConductorListItemDto {
  id: string // flota.conductores_flota.id — el `conductorId` de la API, NUNCA el personaId
  personaId: string // referencia historica a plataforma_canonica.personas
  numeroLegajo: string | null
  // DRIFT: `dtos.ts` los declara `string` no-nulable. La columna es `text NULL` y el gate de PII
  // hace que `null` sea el caso NORMAL, no el borde. Se espejan nullable.
  nombreCompleto: string | null
  dni: string | null
  /**
   * ⚠️ VIENE SIEMPRE `null`: la proyeccion de persona (`datos.md` §6.2) tiene `nombre_mostrable`,
   * `documento_resumen` y `telefono_principal` — NO TIENE EMAIL, y el `find-or-create` tampoco lo
   * devuelve. El backend no inventa columna. Toda columna "Email" del mockup queda en fallback.
   */
  email: string | null
  telefonoPrincipal: string | null
  estado: EstadoConductor
  licencia: LicenciaConductorDto | null // null si no hay documento de tipo `licencia` cargado
  vehiculosAsignadosCount: number // asignaciones VIGENTES (hasta IS NULL y activo)
  fechaAltaOperativa: string // ISO 8601
  activo: boolean // false = baja logica (reversible por POST /reactivar)
}

/** Item de `vehiculosAsignados` — asignaciones VIGENTES del conductor. */
export interface VehiculoAsignadoConductorDto {
  vehiculoFlotaId: string // id LOCAL (A-4): la fila persiste el canonico y el repo traduce al leer
  patente: string | null // de la proyeccion canonica; null si no esta vigente
  rol: RolAsignacionConductor
  fechaAsignacion: string // ISO 8601
}

/**
 * Item de `dispositivosAsignados` — vinculo conductor<->dispositivo. Incluye los CERRADOS: `activa`
 * los distingue. Es de ATRIBUCION (espeja el driver<->device de Traccar), NO fuente de posicion: la
 * posicion del conductor deriva del VEHICULO que conduce (D1).
 */
export interface DispositivoAsignadoConductorDto {
  asignacionId: string
  dispositivoFlotaId: string
  alias: string | null
  imei: string
  fechaAsignacion: string // ISO 8601
  activa: boolean
}

/**
 * Item de `documentosObligatorios`: una fila POR CADA tipo con `es_obligatorio = true` en el
 * catalogo, tenga o no documento cargado (sin fila => `sin_cargar`). Es lo que gobierna el paso a
 * `en_servicio` (409 `flota.conductor.documento_vencido`).
 */
export interface DocumentoObligatorioConductorDto {
  tipo: string // codigo del catalogo `tipos_documento_conductor_flota`
  estado: EstadoDocumento
  fechaVencimiento: string | null // ISO date
}

/** Detalle del conductor. Ver el bloque de §8 para los 6 campos de `dtos.ts` que NO se espejan. */
export interface ConductorDetalleDto extends ConductorListItemDto {
  notas: string | null
  vehiculosAsignados: VehiculoAsignadoConductorDto[] // solo VIGENTES; el historial es otro endpoint
  dispositivosAsignados: DispositivoAsignadoConductorDto[] // vigentes + cerrados (ver `activa`)
  documentosObligatorios: DocumentoObligatorioConductorDto[]
  fechaCreacion: string // ISO 8601
  fechaActualizacion: string // ISO 8601
  creadoPorUsuarioId: string | null
  modificadoPorUsuarioId: string | null
  // ⚠️ VIENEN SIEMPRE `null`: Flota no tiene proyeccion usuario->persona (la de personas se indexa
  // por `persona_id`, no por `usuario_id`). Misma ausencia que en vehiculo y dispositivo.
  creadoPorNombre: string | null
  modificadoPorNombre: string | null
}

/**
 * Modo B del alta: la Persona canonica se resuelve o se crea POR DOCUMENTO. Es el camino REAL del
 * alta (el operador tiene el documento en la mano, no un uuid) y ya no degrada: la superficie
 * `find-or-create-por-documento` existe desde el 2026-08-11 (B-10 cerrado).
 *
 * ⚠️ `email` y `fechaNacimiento` SE DESCARTAN: el contrato firme del Canonico es
 * `{tipoDocumento, numeroDocumento, nombre?, apellido?}` y la proyeccion de Flota no tiene esas
 * columnas. Se declaran para no romper el shape de `dtos.ts` y NO se persisten — no pintar un campo
 * de formulario cuyo valor se pierde en silencio.
 *
 * `nombre` y `apellido` son obligatorios SIEMPRE aunque el Canonico solo los exija al crear: quien
 * llama no sabe de antemano si va a crear, y mandarlos vacios convierte un alta legitima en un 400.
 * Si la Persona ya existe, el Canonico NO los pisa: la identidad la posee el.
 */
export interface PersonaNuevaConductorDto {
  tipoDocumento: string // codigo canonico (`dni`, `pasaporte`, ...); lo valida el Canonico
  numeroDocumento: string
  nombre: string
  apellido: string
  email?: string // ⚠️ se descarta (sin destino ni en el Canonico ni en Flota)
  telefono?: string // si tiene destino: `proyeccion_personas_canonicas_flota.telefono_principal`
  fechaNacimiento?: string // ⚠️ se descarta (ISO date)
}

/**
 * POST /api/flota/conductores -> 201 `ConductorDetalleDto`.
 *
 * EXACTAMENTE UNO de `personaId` (Modo A) o `persona` (Modo B); lo valida el server.
 *
 * ⚠️ Modo A: Flota NO puede verificar el `personaId` contra el Canonico —su superficie interna no
 * tiene un `GET` de persona por id, solo el find-or-create POR DOCUMENTO—, asi que valida contra la
 * unica evidencia que posee (que exista la proyeccion para esa persona y esa organizacion) y
 * devuelve 404 `flota.conductor.persona_no_existe` si no. En la practica el Modo A solo alcanza
 * personas que ESTA organizacion ya proyecto.
 *
 * ⚠️ `licencia` y `enviarInvitacion` NO SE DECLARAN: los dos se rechazan con 400 (ver el bloque de
 * §8). Tiparlos invita a cablear un formulario que no puede guardar — el mismo error que
 * `dispositivoNuevo` en el alta de GPS.
 *
 * El conductor nace en `pendiente_documentacion`.
 *
 * Errores que la UI distingue POR `code`:
 *  - 404 `flota.conductor.persona_no_existe` (Modo A).
 *  - 409 `flota.conductor.persona_ya_es_conductor` — el indice unico es PARCIAL sobre `activo`, asi
 *    que un conductor dado de baja NO ocupa a la persona.
 *  - 400 `flota.conductor.datos_canonicos_invalidos` — el Canonico rechazo el documento. NO
 *    reintentable con los mismos datos.
 *  - 500 `flota.conductor.canonico_no_creable` — la coordinacion no llego a destino. SI es
 *    reintentable y NO quedo nada escrito.
 *
 * ⚠️ Esos 2 ultimos `code` estan IMPLEMENTADOS pero NO en la tabla de `errores.md`: esperan
 * ratificacion del PO (B-24). Si el PO los renombra, cambian aca y en los 2 locales.
 */
export interface CrearConductorRequest {
  personaId?: string // Modo A
  persona?: PersonaNuevaConductorDto // Modo B
  numeroLegajo?: string
  notas?: string
}

/**
 * PATCH /api/flota/conductores/{conductorId} -> 200 `ConductorDetalleDto`.
 *
 * SOLO datos operativos. Los de Persona (nombre, DNI, email, telefono) son proyeccion canonica
 * READ-ONLY (P-A) y ni siquiera se declaran: no hay forma de que Flota escriba el canonico por este
 * verbo. El modal los muestra DESHABILITADOS con la leyenda de Persona.
 *
 * MISMA TRAMPA que los otros PATCH del modulo: `System.Text.Json` no distingue "campo ausente" de
 * "campo en null", asi que el service PRESERVA el valor actual cuando llega `null` — vaciar un campo
 * es hoy un no-op con 200 OK (B-18, abierta). El front avisa antes de guardar.
 */
export interface ActualizarConductorRequest {
  numeroLegajo?: string
  notas?: string
}

/**
 * POST /api/flota/conductores/{conductorId}/estado -> 204 (sin cuerpo).
 *
 * `pendiente_documentacion` esta excluido POR TIPO: es el estado con el que nace el conductor y no
 * es destino de este verbo. NO toca el flag `activo` (ortogonalidad DA-CD2-19): desactivar es
 * `POST .../baja`.
 *
 * El vocabulario del request no es lo mismo que la validez de la transicion DESDE el estado actual:
 * un destino legal pero inalcanzable vuelve 409 `flota.conductor.transicion_invalida`
 * (`args {estadoActual, estadoDestino}`), y `en_servicio` con documentacion obligatoria vencida o
 * sin cargar vuelve 409 `flota.conductor.documento_vencido` (`args {tipoDocumento}`).
 *
 * ⚠️ `motivo` NO SE PERSISTE: no hay columna ni tabla de historial de estado del conductor. Viaja al
 * evento `flota.conductor-operativo-estado-cambiado.v1` y muere ahi. Un tab "historial de estados"
 * no tiene fuente.
 */
export interface CambiarEstadoConductorRequest {
  estadoNuevo: Exclude<EstadoConductor, 'pendiente_documentacion'>
  motivo?: string // texto libre, max 500; no se persiste
}

/** Campos ordenables de `GET /api/flota/conductores`. Default: `Nombre` ASC (no Desc). */
export type ConductorSortBy = 'Nombre' | 'FechaCreacion'

/**
 * Query del listado.
 *
 * DRIFT DECLARADO: `api.md` documenta 4 filtros y el server solo DECLARA 3. `licencia` NO se espeja
 * — ver el bloque de §8. Tampoco existe `search`.
 */
export interface ConductoresPageQuery extends SortedPageQuery<ConductorSortBy> {
  estado?: FiltroEstadoConductor
  asignacion?: FiltroAsignacionConductor
  soloActivos?: boolean // default true en el backend
}

/**
 * Item del historial de asignaciones de vehiculo del conductor —
 * `GET /conductores/{id}/asignaciones` -> `PagedResult<...>`, ORDER BY desde DESC, id DESC.
 *
 * Es el historial COMPLETO (activas + cerradas): `fechaFin === null` marca la vigente.
 */
export interface AsignacionConductorHistorialDto {
  asignacionId: string
  vehiculoFlotaId: string // id LOCAL (A-4)
  patente: string | null // de la proyeccion canonica; `patente ?? id`, nunca `{patente}` crudo
  rol: RolAsignacionConductor
  fechaInicio: string // ISO 8601
  fechaFin: string | null // null = activa
  motivoCierre: MotivoCierreAsignacion | null
}

/** Query de `GET /conductores/{id}/asignaciones` y de `GET /conductores/{id}/dispositivos`. */
export type HistorialConductorQuery = PageQuery

/**
 * Vinculo conductor<->dispositivo — `GET`/`POST /conductores/{id}/dispositivos`.
 * De ATRIBUCION, nunca fuente de posicion (D1).
 */
export interface AsignacionConductorDispositivoDto {
  asignacionId: string
  conductorFlotaId: string
  dispositivoFlotaId: string
  alias: string | null
  imei: string
  fechaInicio: string // ISO 8601
  fechaFin: string | null // null = activa
  motivoCierre: MotivoCierreAsignacion | null
  notas: string | null
  activa: boolean
}

/**
 * POST /api/flota/conductores/{conductorId}/dispositivos -> 200
 * `AsignacionConductorDispositivoDto`. Permiso `flota.conductores.asignar-dispositivo`.
 *
 * ⚠️ `fechaEntrega` NO se declara aunque `dtos.ts` la de como opcional: aceptar un inicio elegido
 * por el cliente permite abrir un periodo en el futuro o anterior a otro que se cierra, y
 * `errores.md` no tiene `code` con el que rechazar esos casos. Mismo criterio que `fechaInicio` en
 * la asignacion de dispositivo (D-S3-16). El default del contrato (ahora) es el que corre.
 */
export interface AsignarDispositivoConductorRequest {
  dispositivoFlotaId: string // id LOCAL del GPS de la flota
  notas?: string // unica tabla de asignacion con columna `notas`
}

/**
 * Body OPCIONAL del `DELETE /conductores/{conductorId}/dispositivos/{asignacionId}` -> 204.
 * Sin body, el motivo de cierre es `otro` (mismo default que D-S3-15).
 *
 * ⚠️ `dtos.ts` NO declara body para este DELETE: el backend lo agrego por simetria con los otros 2
 * cierres (la columna `motivo_cierre` existe en esta tabla igual que en aquellas) y lo dejo
 * reportado para ratificacion del PO.
 */
export interface CerrarVinculoConductorDispositivoRequest {
  motivo?: MotivoCierreAsignacion
}

/* ── Asignacion vehiculo<->conductor (cuelga del VEHICULO, `api.md` §Asignaciones) ───────────── */

/**
 * POST /api/flota/vehiculos/{vehiculoFlotaId}/asignaciones/conductor -> 200
 * `AsignacionVehiculoConductorDto`. Permiso `flota.vehiculos.asignar-conductor` (grupo VEHICULOS, no
 * conductores: la accion vive sobre el vinculo).
 *
 * ⚠️ A DIFERENCIA del gemelo de dispositivo, NO coordina con PlataformaCanonica: el conductor de un
 * vehiculo es un hecho operativo propio de Flota y ninguna frontera declara un write canonico.
 * Consecuencia REAL y silenciosa (B-20, abierta): `plataforma_canonica.vehiculo_conductores` no se
 * entera, el Canonico sigue diciendo "no hay principal" y Notificaciones NO le avisa a nadie. La UI
 * NO debe prometer que se notifica al conductor.
 *
 * ⚠️ El principal NO se reasigna solo: cambiar de principal es DESASIGNAR + ASIGNAR, dos requests
 * sin atomicidad. Y asignar NO pasa al conductor a `en_servicio`: eso es una transicion explicita.
 *
 * Errores que la UI distingue POR `code`, los 3 en 409:
 *  - `flota.conductor.suspendido_no_asignable`
 *  - `flota.conductor.licencia_vencida` (solo `vencido` bloquea; `por_vencer` avisa y `sin_cargar`
 *    no bloquea — el contrato no da code para "todavia no cargo la licencia")
 *  - `flota.vehiculo.ya_tiene_principal` — sale del choque real del indice unico parcial (23505).
 */
export interface AsignarConductorRequest {
  conductorFlotaId: string // id LOCAL del conductor
  rol: RolAsignacionConductor // REQUERIDO: no hay default adoptado
}

/**
 * Body OPCIONAL del
 * DELETE /api/flota/vehiculos/{vehiculoFlotaId}/asignaciones/conductor/{asignacionId} -> 204.
 * Sin body, el motivo de cierre es `otro`.
 *
 * `dtos.ts` declara ademas `vehiculoFlotaId` y `conductorFlotaId`; el backend NO los implementa: los
 * dos son identidad de la ruta y duplicarlos crea contradicciones sin `code` con el que rechazarlas.
 */
export interface DesasignarConductorRequest {
  motivo?: MotivoCierreAsignacion
}

/**
 * Respuesta del `POST` de asignacion de conductor.
 *
 * ⚠️ SHAPE NO DEFINIDO EN `dtos.ts` — mismo hueco que D-S3-16 destapo para el gemelo de dispositivo,
 * ratificable por el PO. Es la UNICA fuente del `asignacionId` que el `DELETE` pide en la URL:
 * `GET /vehiculos/{id}/asignaciones` NO esta implementado y `VehiculoDetalleDto.conductoresAsignados`
 * no lo lleva (y encima viene vacio siempre, ver §3). Un cliente que descarta esta respuesta deja al
 * usuario sin forma de desasignar.
 */
export interface AsignacionVehiculoConductorDto {
  asignacionId: string
  vehiculoFlotaId: string // id LOCAL (A-4)
  conductorFlotaId: string
  rol: RolAsignacionConductor
  fechaAsignacion: string // ISO 8601
  fechaDesasignacion: string | null // null = vigente
  motivoCierre: MotivoCierreAsignacion | null
}

/* ── Documentos adjuntos — fase 1 con URL externa (D-C2) ─────────────────────────────────────── */

/**
 * Documento adjunto del conductor. `GET /conductores/{id}/documentos` devuelve un ARRAY PLANO, no
 * `PagedResult<T>`: `api.md` no declara paginacion para esa fila.
 *
 * ⚠️ Los 3 endpoints de documentos piden `flota.conductores.gestionar-documentos`, TAMBIEN EL `GET`
 * — no `leer`. Es la fila de la matriz que no sigue la intuicion (P-F) y esta transcripta tal cual:
 * un usuario con `leer` y sin `gestionar-documentos` recibe 403 AL LISTAR.
 *
 * FASE 1 (D-C2): sin binarios. `storageKey` y `urlDescarga` no existen en v1 — entran con
 * `Platform.Storage` en fase 2.
 */
export interface DocumentoDto {
  id: string
  // El request lo llama `tipoDocumento` y la respuesta `tipo`: los 2 nombres los fija `dtos.ts` §10.
  tipo: string // codigo del catalogo `tipos_documento_conductor_flota`
  numero: string | null
  fechaEmision: string | null // ISO date
  fechaVencimiento: string | null // ISO date
  estadoDerivado: EstadoDocumento // calculado al leer, NUNCA persistido (umbral 30 dias, backend)
  urlExterna: string | null // null = metadatos cargados sin archivo todavia
  fechaCreacion: string // ISO 8601
}

/**
 * POST /api/flota/conductores/{conductorId}/documentos -> 201 `DocumentoDto`.
 *
 * ⚠️ `application/json`, NUNCA `multipart/form-data`: Flota no recibe binarios en v1 (D-C2). El
 * formulario pide una URL `https` + metadatos — nada de `input type="file"`. El upload de binario
 * llega en fase 2, cuando exista `Platform.Storage` (hoy NO existe).
 *
 * `urlExterna` es OPCIONAL: se admite cargar metadatos y adjuntar el archivo despues.
 *
 * ACA SE CARGA LA LICENCIA (`tipoDocumento: 'licencia'`): es la fuente que `dtos.ts` §4 declara para
 * el objeto `licencia`, y el motivo por el que el alta rechaza ese bloque mientras B-21 siga abierta.
 * Escribe `numero`, `fechaEmision` y `fechaVencimiento`; `categoria` sigue sin destino.
 *
 * Errores POR `code`:
 *  - 400 `flota.documento.tipo_invalido` (`args {tipo}`) — fuera del catalogo DB de la organizacion.
 *  - 400 `flota.documento.url_no_permitida` (`args {url}`) — misma regla anti-SSRF que los webhooks:
 *    exige `https`, rechaza IP privada/loopback/link-local y hostname que resuelva a rango privado.
 */
export interface SubirDocumentoRequest {
  tipoDocumento: string // codigo del catalogo; lo valida el SERVICE contra la tabla, no el Validator
  urlExterna?: string // https; opcional
  numero?: string
  fechaEmision?: string // ISO date
  fechaVencimiento?: string // ISO date
}

/* ============================================================================
 * 9. MAPA EN VIVO — slice-05 `f-04` (`MapaController`, 2 endpoints)
 *
 * Espejo de `Flota.Application/DTOs/MapaDtos.cs`, que es el codigo que corre. El browser llama
 * SIEMPRE a `Flota.Api`: nunca a Telemetria, nunca a Traccar, nunca a RabbitMQ.
 *
 * ── LO QUE ESTA SECCION NO DECLARA, Y POR QUE ────────────────────────────────────────────────
 *  - **Query params del mapa** (`bbox`, `estado`, `conductorId`): el controller NO ACEPTA NINGUNO
 *    (P6 abierta). `api.md` §Mapa en vivo no los declara, y un param no declarado lo descarta el
 *    binder sin error. Filtrar el mapa es filtrado LOCAL sobre lo que llego.
 *  - **SSE / WebSocket**: fase 2 por contrato. El refresco es polling (10-15 s, C-9).
 *  - **Geozonas sobre el mapa**: DIFERIDO (DA-08).
 *  - **Historico / recorridos / viajes**: sin fuente (B-9) — esos endpoints dan 500
 *    `flota.telemetria.no_disponible` y NO se piden.
 * ========================================================================== */

/**
 * `GET /api/flota/mapa/vehiculos` -> 200 `MapaResponseDto`. Permiso `flota.vehiculos.leer`.
 *
 * NO es `PagedResult<T>` y es deliberado: el mapa no pagina (dibujar media flota es peor que no
 * dibujarla). El backend resuelve todo con **2 llamadas por-organizacion fijas**, no N por vehiculo.
 *
 * ⚠️ **Un vehiculo sin coordenadas NO viene en `items`** — sale del array en vez de dibujarse en
 * `0,0`, que es un punto real en el golfo de Guinea. O sea: `items.length` puede ser MENOR que la
 * cantidad de vehiculos de la flota, y esa diferencia es informacion que la pantalla debe decir
 * ("N sin ubicacion"), no un error.
 */
export interface MapaResponseDto {
  items: MapaItemDto[]
  fechaActualizacion: string // ISO 8601 — cuando Flota COMPUSO la respuesta, no el reporte GPS
}

/**
 * Marcador del mapa.
 *
 * ⚠️ 2 campos del contrato viajan SIEMPRE `null` (B-33, abierta) y por eso se tipan nullable acá
 * aunque `dtos.ts` los declare `number`:
 *  - `ubicacion.direccionGrados` (rumbo): la unica fuente batch no lo trae; el rumbo existe solo
 *    per-vehiculo y traerlo para una lista seria el fan-out que C-17 PROHIBE. **No hay flecha de
 *    orientacion en el mapa.**
 *  - `alertasActivasCount`: no hay endpoint batch de alertas. **No hay burbuja de conteo.**
 * Rellenarlos con `0` seria afirmar "apunta al norte" y "no tiene alertas". El mapa se dibuja sin
 * los dos.
 */
export interface MapaItemDto {
  vehiculoFlotaId: string // id LOCAL (A-4): es el que usa el deep-link mapa -> detalle
  patente: string | null // proyeccion canonica; puede no estar vigente
  modelo: string | null
  ubicacion: UbicacionMapaDto
  velocidadKmH: number
  // DRIFT 3 del encabezado: nullable, `null` != "motor apagado".
  ignicion: boolean | null
  estado: EstadoConexion // ya mapeado a snake_case; ver §2
  conductorAsignado: ConductorMapaDto | null // dato PROPIO de Flota, no de Telemetria
  alertasActivasCount: number | null // ⚠️ SIEMPRE null (B-33)
}

export interface UbicacionMapaDto {
  latitud: number
  longitud: number
  direccionGrados: number | null // ⚠️ SIEMPRE null (B-33)
  fechaUtc: string // instante del reporte EN EL DISPOSITIVO
}

export interface ConductorMapaDto {
  conductorFlotaId: string
  nombreCompleto: string | null // proyeccion canonica gateada por PII; puede venir null
}

/**
 * Vocabulario del campo `motor` de `VehiculoEnVivoDto`.
 *
 * ⚠️ `ralenti` NO SE EMITE en v1 y el tipo lo declara solo para que el vocabulario este completo en
 * un lugar: su umbral es una PENDIENTE del PO (`fronteras/telemetria.md` §4 — los mockups usan 5,
 * 22 y 42 minutos, mutuamente inconsistentes). Un vehiculo detenido con la ignicion puesta se
 * informa `encendido`, que es cierto. **No inventar el estado intermedio.**
 */
export type EstadoMotor = 'encendido' | 'apagado' | 'ralenti'

/**
 * `GET /api/flota/mapa/vehiculos/{vehiculoFlotaId}/en-vivo` -> 200 `VehiculoEnVivoDto`.
 * Permiso `flota.vehiculos.leer`.
 *
 * Superficie de UN recurso: aca los endpoints per-vehiculo de Telemetria SI son el camino correcto
 * (3 llamadas para 1 vehiculo no es fan-out), asi que `rumbo` y `altitud` **si tienen dato** — a
 * diferencia del listado del mapa.
 *
 * Fuera del DTO por contrato: senal GSM, satelites, `hdop` y red movil (B-6, no existen upstream);
 * "km de hoy" (sin historico, B-9); telefono del conductor y direccion textual/barrio (DA-MV-04).
 * El mockup los dibuja y no tienen fuente.
 */
export interface VehiculoEnVivoDto {
  vehiculoFlotaId: string
  patente: string | null
  posicion: PosicionEnVivoDto | null // null = Telemetria no tiene posicion (partial-data)
  rumbo: number | null // grados 0..359; aca SI hay fuente
  velocidadKmh: number | null
  ignicion: boolean | null
  motor: EstadoMotor | null // nunca `ralenti` en v1
  odometroKm: number | null // en KM: el backend ya dividio por 1000 (upstream viene en metros)
  altitud: number | null
  conductorAsignado: ConductorMapaDto | null
  estado: EstadoConexion
  fechaSnapshotUtc: string // momento de la composicion en Flota
}

export interface PosicionEnVivoDto {
  latitud: number
  longitud: number
  fechaUtc: string
}
