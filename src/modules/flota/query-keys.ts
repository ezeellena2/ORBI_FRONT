import type {
  AlertasPageQuery,
  ConductoresPageQuery,
  DispositivosPageQuery,
  HistorialConductorQuery,
  HistorialStockQuery,
  ProblemasPageQuery,
  ReglasPageQuery,
  VehiculosPageQuery,
  WebhooksPageQuery,
} from '@/services/contracts/flota'

/**
 * Query keys de Flota — convencion `['flota', '<recurso>', <parametros>]` de `frontend.md` §5.
 *
 * El prefijo compartido es deliberado: invalidar `['flota', 'vehiculos']` alcanza al listado con
 * cualquier filtro Y al detalle de cualquier id. Es exactamente lo que hace falta despues de un
 * alta, una edicion o una baja.
 *
 * ⚠️ REGLA DE ESTABILIDAD DE LA KEY (ya nos costo un bucle infinito de requests una vez, en
 * `TabHistorial`): todo lo que entra en una key tiene que ser estable POR VALOR entre renders. Un
 * objeto recreado en cada render —o un `new Date().toISOString()` adentro— produce una key nueva por
 * render, y React Query dispara una query nueva por render. La forma correcta es hacer el DATO
 * estable (truncar el rango al dia, leer el store con selectores por campo), NUNCA memoizarlo a
 * mano: `useMemo` esta prohibido en este repo.
 *
 * ⚠️ LOS FILTROS NUEVOS NO LLEVAN KEY PROPIA. Los 3 que slice-05 destrabo (`estado` y `situacion`
 * de vehiculos, `conexion` de dispositivos) viajan DENTRO del objeto `query` que ya recibe cada
 * key de listado, asi que cambiarlos ya produce una key distinta y un refetch. Agregar un segmento
 * aparte por filtro partiria el prefijo (`['flota','vehiculos']`) que las mutations invalidan, y la
 * mitad de las invalidaciones dejarian de alcanzar al listado.
 */
export const flotaKeys = {
  /** Raiz del modulo. Invalidarla tira toda la cache de Flota. */
  todo: () => ['flota'] as const,

  /** Prefijo del recurso vehiculo: listado + detalle. Es la key que invalidan las mutations. */
  vehiculos: () => ['flota', 'vehiculos'] as const,

  vehiculosListado: (query: VehiculosPageQuery) => ['flota', 'vehiculos', query] as const,

  vehiculoDetalle: (vehiculoFlotaId: string) =>
    ['flota', 'vehiculos', vehiculoFlotaId] as const,

  /** Prefijo del recurso dispositivo: listado + detalle + historial. */
  dispositivos: () => ['flota', 'dispositivos'] as const,

  dispositivosListado: (query: DispositivosPageQuery) =>
    ['flota', 'dispositivos', query] as const,

  dispositivoDetalle: (dispositivoId: string) =>
    ['flota', 'dispositivos', dispositivoId] as const,

  /**
   * Historial de transiciones de stock de UN dispositivo. Cuelga del prefijo del detalle a
   * proposito: un cambio de estado de stock invalida `dispositivoDetalle(id)` y el historial cae
   * dentro de ese prefijo, asi que se refresca con la misma invalidacion. La `query` va al final
   * para que el prefijo siga alcanzando a cualquier pagina.
   */
  dispositivoHistorialStock: (dispositivoId: string, query: HistorialStockQuery) =>
    ['flota', 'dispositivos', dispositivoId, 'historial-stock', query] as const,

  /**
   * Snapshot tecnico en vivo de UN dispositivo. Cuelga del prefijo del detalle igual que el
   * historial, pero su `staleTime` es mucho mas corto: es dato de Telemetria, no dato propio.
   *
   * Que caiga dentro del prefijo tiene una consecuencia buena y una neutra: una edicion del
   * dispositivo lo invalida de mas (cuesta un request barato) y nunca lo deja viejo.
   */
  dispositivoTelemetria: (dispositivoId: string) =>
    ['flota', 'dispositivos', dispositivoId, 'telemetria'] as const,

  /**
   * Prefijo del MAPA EN VIVO. Es un recurso propio y NO cuelga de `['flota','vehiculos']` a
   * proposito: el mapa se refresca por **polling** (10-15 s), asi que ya llega solo al dia. Si
   * colgara del prefijo de vehiculos, cada alta/edicion/baja lo invalidaria de mas — y la
   * invalidacion de un listado paginado no tiene por que arrastrar una respuesta que trae la flota
   * entera.
   */
  mapa: () => ['flota', 'mapa'] as const,

  /**
   * Marcadores de toda la flota. SIN `query`: `GET /api/flota/mapa/vehiculos` **no acepta ningun
   * parametro** (P6 abierta) y no pagina, asi que la key no tiene nada variable que llevar. Meterle
   * los filtros de pantalla seria mentir sobre lo que distingue una respuesta de otra: el filtrado
   * del mapa es LOCAL, sobre los mismos datos.
   */
  mapaVehiculos: () => ['flota', 'mapa', 'vehiculos'] as const,

  /**
   * Detalle en vivo de UN vehiculo (el panel que se abre al tocar un marcador). Cuelga del prefijo
   * del mapa, no del de vehiculos: es dato de Telemetria con su propia cadencia, y una edicion de
   * los datos operativos del vehiculo no cambia su posicion.
   */
  mapaVehiculoEnVivo: (vehiculoFlotaId: string) =>
    ['flota', 'mapa', 'vehiculos', vehiculoFlotaId, 'en-vivo'] as const,

  /** Prefijo del recurso conductor: listado + detalle + sus 3 sub-recursos. */
  conductores: () => ['flota', 'conductores'] as const,

  conductoresListado: (query: ConductoresPageQuery) => ['flota', 'conductores', query] as const,

  conductorDetalle: (conductorId: string) => ['flota', 'conductores', conductorId] as const,

  /**
   * Historial de asignaciones a vehiculos de UN conductor. Cuelga del prefijo del detalle a
   * proposito: asignar o desasignar invalida `conductorDetalle(id)` y el historial cae dentro de ese
   * prefijo, asi que se refresca con la misma invalidacion. La `query` va al final para que el
   * prefijo siga alcanzando a cualquier pagina.
   */
  conductorAsignaciones: (conductorId: string, query: HistorialConductorQuery) =>
    ['flota', 'conductores', conductorId, 'asignaciones', query] as const,

  /** Vinculos conductor<->dispositivo (activos + historial). Mismo criterio de anidado. */
  conductorDispositivos: (conductorId: string, query: HistorialConductorQuery) =>
    ['flota', 'conductores', conductorId, 'dispositivos', query] as const,

  /**
   * Documentos del conductor. SIN `query`: el endpoint devuelve un array plano, no `PagedResult<T>`
   * (`api.md` no declara paginacion para esa fila).
   */
  conductorDocumentos: (conductorId: string) =>
    ['flota', 'conductores', conductorId, 'documentos'] as const,

  /**
   * Catalogos GROWABLES del dispositivo (`flota.modelos_dispositivo_flota` /
   * `flota.proveedores_sim_flota`). Prefijo propio: el alta de una fila propia los invalida a ellos,
   * NO al listado de dispositivos.
   *
   * NO cuelgan de `dispositivos()`: si colgaran, cada alta o edicion de un dispositivo tiraria la
   * cache de dos catalogos que no cambiaron, y estos tienen `staleTime` largo justamente porque casi
   * nunca cambian.
   */
  catalogosDispositivo: () => ['flota', 'catalogos-dispositivo'] as const,

  modelosDispositivo: () => ['flota', 'catalogos-dispositivo', 'modelos'] as const,

  proveedoresSim: () => ['flota', 'catalogos-dispositivo', 'proveedores-sim'] as const,

  /**
   * Catalogo CANONICO del vehiculo (lo sirve PlataformaCanonica, no Flota). Se namespacea bajo
   * `flota` igual porque la cache es del cliente, no del backend: lo que importa es poder
   * invalidarlo con el resto del modulo.
   */
  catalogoMarcas: (q: string | undefined) => ['flota', 'catalogo', 'marcas', q ?? ''] as const,

  catalogoTipos: () => ['flota', 'catalogo', 'tipos-vehiculo'] as const,

  /**
   * Prefijo del CENTRO DE PROBLEMAS (slice-06). Cubre la bandeja, el timeline, el kanban y el
   * ticket: las **4 vistas leen del mismo par de endpoints** (`GET /problemas` y
   * `GET /problemas/{id}`), asi que invalidar este prefijo las mueve a las 4 de una vez. Es
   * exactamente lo que hace falta despues de asignar, silenciar o resolver.
   */
  problemas: () => ['flota', 'problemas'] as const,

  problemasListado: (query: ProblemasPageQuery) => ['flota', 'problemas', query] as const,

  problemaDetalle: (problemaId: string) => ['flota', 'problemas', problemaId] as const,

  /**
   * REGLAS del motor — prefijo PROPIO, no cuelga de `problemas()`, aunque la ruta HTTP si cuelgue
   * (`/api/flota/problemas/reglas`). La cache modela lo que se invalida junto, no la URL:
   *  - resolver un problema **no cambia** ninguna regla;
   *  - pausar una regla **no cambia** los problemas ya abiertos (el vinculo problema -> regla que lo
   *    disparo ni siquiera existe como columna, PENDIENTE #8).
   * Colgarlas del prefijo de problemas tiraria la tabla de reglas en cada accion de la bandeja.
   */
  reglasProblemas: () => ['flota', 'reglas'] as const,

  reglasProblemasListado: (query: ReglasPageQuery) => ['flota', 'reglas', query] as const,

  /**
   * INTEGRACIONES (webhooks salientes) — prefijo propio por el mismo criterio, y con una razon extra
   * medida: **ninguna columna ata una entrega de webhook a un problema**, asi que resolver un
   * problema no puede cambiar el log de entregas ni al reves (`integracion` y `webhooks[]` del
   * detalle viajan neutros SIEMPRE).
   */
  integraciones: () => ['flota', 'integraciones'] as const,

  webhooksListado: (query: WebhooksPageQuery) =>
    ['flota', 'integraciones', 'webhooks', query] as const,

  /**
   * Log de entregas. Cuelga del prefijo de integraciones —una prueba (`/probar`) agrega una fila y
   * tiene que verse— pero es una key **hermana** del listado de endpoints, no hija: el endpoint no
   * es un segmento porque `GET /webhooks/entregas` es de **toda la organizacion** y no acepta filtro
   * por endpoint (ver `integraciones-service`).
   */
  webhookEntregas: (query: WebhooksPageQuery) =>
    ['flota', 'integraciones', 'entregas', query] as const,

  /**
   * SENALES (alertas). Prefijo propio: es otro controller y otro permiso
   * (`flota.vehiculos.leer`), y hoy **no tiene ningun escritor** — nada la invalida.
   */
  alertas: () => ['flota', 'alertas'] as const,

  alertasListado: (query: AlertasPageQuery) => ['flota', 'alertas', query] as const,
}

/**
 * Las keys que hay que invalidar despues de ASIGNAR o DESASIGNAR un dispositivo a un vehiculo.
 *
 * ⚠️ NO ALCANZA CON UN SOLO PREFIJO, y por eso esto es una funcion y no un comentario: una
 * asignacion mueve CUATRO superficies a la vez, en dos arboles de cache distintos.
 *  1. detalle del VEHICULO — gana o pierde su bloque `dispositivo`;
 *  2. detalle del DISPOSITIVO — cambia `vehiculoInstalado`, `estadoOperativo`
 *     (`en_stock` ⇄ `instalado`) y `historialAsignaciones`;
 *  3. listado de VEHICULOS — la columna de GPS de esa fila;
 *  4. listado de DISPOSITIVOS — la columna de vehiculo, el badge de stock y el filtro `asignacion`.
 *
 * Y en una REASIGNACION son cinco: el dispositivo SALIENTE tambien cambia (vuelve a `en_stock`), y
 * su detalle puede estar en cache. Por eso se invalidan los dos PREFIJOS enteros y no las 4 keys
 * puntuales: enumerar ids exige conocer de antemano cual era el GPS saliente, que es justo el dato
 * que la respuesta del `POST` no trae.
 */
export const flotaKeysAfectadasPorAsignacion = () =>
  [flotaKeys.vehiculos(), flotaKeys.dispositivos()] as const

/**
 * Las keys que hay que invalidar despues de ASIGNAR o DESASIGNAR un conductor a un vehiculo.
 *
 * ⚠️ Es el gemelo de `flotaKeysAfectadasPorAsignacion` y hace falta por la MISMA razon: una
 * asignacion de conductor mueve superficies en DOS arboles de cache distintos.
 *  1. detalle del CONDUCTOR — `vehiculosAsignados`, `vehiculosAsignadosCount` y su historial;
 *  2. listado de CONDUCTORES — la columna Asignaciones y el filtro `asignacion`;
 *  3. detalle del VEHICULO — su bloque de conductores;
 *  4. listado de VEHICULOS — la columna de conductores.
 *
 * ⚠️ Las 2 superficies del VEHICULO **hoy no cambian visiblemente**: `conductorPrincipal`,
 * `conductoresCount` y `conductoresAsignados` vienen `null`/`0`/`[]` en el 100% de las respuestas
 * (composicion faltante, ver el contrato §3). ⚠️ **Ya no es "hasta slice-05"**: slice-05 cerro el
 * 2026-08-12 sin tomarla, porque es composicion **intra-schema** (no depende de Telemetria) y su
 * dueno declarado en `ESTADO.md` es el PO. Se invalidan igual: el dia que alguien componga esos
 * campos, la invalidacion ya va a estar puesta y no hay que acordarse. Invalidar de mas cuesta un
 * refetch; invalidar de menos deja la pantalla mintiendo hasta un F5.
 *
 * Se invalidan los 2 PREFIJOS enteros y no keys puntuales porque "cambiar conductor" son DOS
 * requests (DELETE + POST) sobre asignaciones distintas, y enumerar ids exige conocer de antemano
 * cual era el conductor saliente.
 */
export const flotaKeysAfectadasPorAsignacionConductor = () =>
  [flotaKeys.vehiculos(), flotaKeys.conductores()] as const

/**
 * Las keys que hay que invalidar despues de abrir o cerrar un vinculo conductor<->dispositivo.
 *
 * Toca el detalle del CONDUCTOR (`dispositivosAsignados` + la lista paginada de vinculos) y, del
 * otro lado, el dispositivo: el vinculo es N:N historico y un mismo GPS puede estar vinculado a
 * varios conductores. NO toca vehiculos: es atribucion, no instalacion.
 */
export const flotaKeysAfectadasPorVinculoConductorDispositivo = () =>
  [flotaKeys.conductores(), flotaKeys.dispositivos()] as const

/**
 * Las keys que hay que invalidar despues de ASIGNAR, SILENCIAR o RESOLVER un problema.
 *
 * Es **un solo prefijo a proposito**, y conviene entender por que alcanza y por que no hay que
 * agregarle nada:
 *
 * ✅ **Lo que SI se mueve, y todo cae bajo `['flota','problemas']`**: la bandeja de la Sala, la vista
 *    timeline y el kanban (las 3 leen `GET /problemas`, no hay endpoint propio de ninguna) y el
 *    ticket abierto (`GET /problemas/{id}`). Las 3 mutaciones devuelven **204 sin cuerpo**, asi que
 *    no hay DTO con el que sembrar el detalle: se invalida y se refetchea.
 *
 * ❌ **Lo que NO se mueve, aunque parezca**:
 *  - las **reglas** — no existe el vinculo problema -> regla que lo disparo (PENDIENTE #8), y
 *    `ultimasActivacionesCount` viaja en 0 SIEMPRE. Invalidarlas seria tirar una tabla que no
 *    cambio;
 *  - las **entregas de webhook** — ninguna columna ata una entrega a un problema, asi que resolver
 *    no puede producir ni cambiar una fila del log;
 *  - las **alertas** — no tienen escritor (GATE 2);
 *  - **vehiculos** y **conductores** — el problema los referencia, no los modifica.
 *
 * Invalidar de mas cuesta un refetch; invalidar de menos deja la pantalla mintiendo hasta un F5. Acá
 * el limite esta medido contra el esquema, no supuesto.
 */
export const flotaKeysAfectadasPorCambioDeProblema = () => [flotaKeys.problemas()] as const

/**
 * Las keys que hay que invalidar despues de tocar un WEBHOOK (alta, edicion, baja, prueba, rotacion
 * o reencolado).
 *
 * ⚠️ **Es el prefijo ENTERO de integraciones y no la key del listado**, porque casi toda mutacion
 * mueve **dos** superficies que viven en ramas distintas:
 *  1. la lista de endpoints — `activo`, `url`, `nombre`, `secretoHuella`, `ultimoEstado` y
 *     `ultimoEnvioUtc`;
 *  2. la tabla de entregas — `POST .../probar` agrega **una fila nueva**, y `/reintentar` cambia el
 *     `estado` y el `proximoIntentoUtc` de varias.
 *
 * `POST .../probar` es el caso que lo hace obligatorio: el badge del endpoint se **deriva** de
 * `activo` + `ultimoEstado`, asi que una prueba cambia las 2 cosas a la vez.
 *
 * ⚠️ **No incluye `problemas()`**: `integracion.{enviado,ultimoEstado}` y `webhooks[]` del problema
 * viajan neutros SIEMPRE (no hay columna que ate una entrega a un problema), asi que ninguna
 * operacion de webhook puede cambiar lo que muestra el ticket.
 */
export const flotaKeysAfectadasPorWebhook = () => [flotaKeys.integraciones()] as const
