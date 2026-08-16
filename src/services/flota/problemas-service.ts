import { appConfig } from '@/config/env'
import { httpClient } from '@/services/http/http-client'
import type {
  AsignarProblemaRequest,
  PagedResult,
  ProblemaOperativoDetalleDto,
  ProblemaOperativoListItemDto,
  ProblemasPageQuery,
  ResolverProblemaRequest,
  SilenciarProblemaRequest,
} from '@/services/contracts/flota'

/**
 * Cliente HTTP de la seccion §Problemas operativos de `Flota.Api` (`ProblemasController`, slice-06
 * `f-04`). Un metodo por endpoint del contrato: los **5 que existen**, ni uno mas.
 *
 * Mismo patron que los 5 services de Flota que ya estan: `baseURL` por request apunta a Flota
 * (7213) y se reusa el `httpClient` para heredar el interceptor de sesion (Bearer, 401 -> refresh ->
 * retry, Accept-Language) en vez de duplicar esa logica en otra instancia de axios.
 *
 * ══ LAS 3 FILAS DE `api.md` QUE ESTE ARCHIVO NO EXPONE ══════════════════════════════════════════
 * Ninguna es un olvido y ninguna es "todavia no la cablee": las 3 estan **sin enrutar del lado del
 * server**, con su ausencia anclada por `MatrizEndpointPermisoTests`. Agregar el metodo igual seria
 * una llamada fantasma: **compila, y en runtime es un 404 de routing sin `code`** que ninguna
 * pantalla puede explicarle al usuario.
 *
 *  - **`POST /problemas/{problemaId}/estado`** — la transicion libre de estado, que es lo que mueve
 *    el kanban. Le faltan DOS cosas al contrato: el **body** (`dtos.ts` §9 no publica request para
 *    esta accion) y el **catalogo de transiciones permitidas** (`transiciones_problema_flota` ni
 *    siquiera se creo, `ddl.sql` §6.10 #14). El caso de uso SI existe del lado del server
 *    (`IProblemaOperativoService.CambiarEstado`) y es **fail-closed**: con el catalogo vacio, toda
 *    transicion se rechaza con 409 `flota.problema.transicion_invalida`.
 *
 *    ⚠️ **Ojo con la diferencia, que cambia lo que la pantalla tiene que decir**: el 409 es lo que
 *    devolveria el caso de uso *si estuviera enrutado*. Hoy **no lo esta**, asi que un `POST` a esa
 *    URL no llega al 409: rebota en el router. Por eso el kanban de `f-08` hace el ciclo completo
 *    (optimista -> ROLLBACK -> aviso) **sin emitir request**, apoyado en
 *    `TRANSICION_DE_ESTADO_DISPONIBLE` de `modules/flota/vocabulario-centro-problemas.ts`. El dia
 *    que el PO cierre las 2 PENDIENTE se agrega el metodo aca y la pantalla no cambia de forma.
 *
 *  - **`POST /problemas/{problemaId}/comentarios`** — PENDIENTE #17:
 *    `problemas_timeline_flota.titulo` es NOT NULL y `CrearComentarioProblemaRequest` trae **un**
 *    campo de texto; ningun documento dice cual de los dos lo recibe. `f-03` no construyo el caso
 *    de uso por el mismo motivo.
 *
 *  - **`GET /problemas/exportar`** — B-34: su **unico** camino de error (400 por superar las 10.000
 *    filas) no tiene `code` en `errores.md`, que lo lista en §Pendientes. Es exactamente el motivo
 *    por el que slice-05 paro en los otros 3 `/exportar`.
 *
 * ══ LO QUE SI RESPONDE, Y CON QUE LIMITES ═══════════════════════════════════════════════════════
 *  - `GET /problemas` **no acepta filtros ni `sortBy`** (B-17): `ProblemasPageQuery` es `PageQuery`
 *    pelado, igual que el backend. Mandar parametros de mas no da error — el binder los descarta y
 *    la respuesta viene sin filtrar, que es peor que no ofrecer el filtro (D-S3-33).
 *  - **Nunca 500 por Telemetria.** El listado es 100 % dato propio de Flota y el detalle degrada a
 *    **200 partial-data** con `contextoOperativo: null`. Ninguna de las 2 superficies esta en la
 *    lista cerrada de las que responden 500 `flota.telemetria.no_disponible`.
 *  - Las 3 mutaciones devuelven **204 SIN CUERPO**. No sembrar la respuesta en la cache del detalle:
 *    con axios el cuerpo de un 204 es el **string vacio** (es el defecto D-S5F-1, ya cometido con 3
 *    mutaciones de dispositivo).
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

const BASE = '/api/flota/problemas'

const configFlota = { baseURL: appConfig.flotaApiBaseUrl } as const

export const problemasService = {
  /**
   * GET /api/flota/problemas -> 200 `PagedResult<ProblemaOperativoListItemDto>`.
   * Permiso `flota.problemas.leer`.
   *
   * ORDER BY unico del contrato (prioridad DESC, deteccion DESC, id DESC), resuelto por el backend:
   * **el front no reordena** (A-15). La bandeja, el timeline y el kanban comparten esta llamada; no
   * existe endpoint de timeline ni de tablero.
   *
   * ⚠️ Con el motor sin sembrar (`FlotaActivacionSeedService` no existe y la tabla de configuracion
   * por-organizacion no la nombra ningun doc), `ListarHabilitadas` devuelve 0 reglas y **nadie crea
   * problemas todavia**. Una bandeja vacia hoy NO significa "tu flota esta tranquila".
   */
  listar: (query: ProblemasPageQuery = {}) =>
    httpClient.get<PagedResult<ProblemaOperativoListItemDto>>(BASE, {
      ...configFlota,
      params: query,
    }),

  /**
   * GET /api/flota/problemas/{problemaId} -> 200 `ProblemaOperativoDetalleDto` |
   * 404 `flota.problema.no_existe`. Permiso `flota.problemas.leer`.
   *
   * El 404 tambien cubre el **cross-tenant**: el `organizacion_id` va en el WHERE, asi que un id de
   * otra organizacion es indistinguible de uno inexistente. Nunca 403.
   *
   * Campos que llegan neutros SIEMPRE y hay que tratar como partial-data (ver el contrato §10):
   * `integracion` (`{enviado:false, ultimoEstado:null}`), `webhooks: []`,
   * `contextoOperativo.criticidadActivo: null`.
   */
  obtener: (problemaId: string) =>
    httpClient.get<ProblemaOperativoDetalleDto>(`${BASE}/${problemaId}`, configFlota),

  /**
   * POST /api/flota/problemas/{problemaId}/asignar -> **204 SIN CUERPO** | 404 |
   * 409 `flota.problema.transicion_invalida`. Permiso `flota.problemas.asignar`.
   *
   * ⚠️ El 409 sobre un problema **terminal** (ya `resuelto`/`descartado`) llega con ESE code y no
   * con uno propio: el catalogo no tiene `code` para "accion sobre problema cerrado" y el backend
   * no lo invento. Se distingue por `args.estadoActual`, no por el code — ver
   * `tratamientoDeErrorCentro` en `modules/flota/vocabulario-centro-problemas.ts`.
   *
   * ⚠️ El `comentario` opcional **no se persiste como comentario del timeline** (PENDIENTE #17):
   * viaja al `detalle` del hecho `asignado`. No prometerle al usuario que va a quedar en el hilo.
   */
  asignar: (problemaId: string, data: AsignarProblemaRequest) =>
    httpClient.post<void>(`${BASE}/${problemaId}/asignar`, data, configFlota),

  /**
   * POST /api/flota/problemas/{problemaId}/silenciar -> **204 SIN CUERPO** | 400 | 404 | 409.
   * Permiso `flota.problemas.silenciar`.
   *
   * Los **4** campos del body son obligatorios: el `ValidationActionFilter` devuelve 400
   * `ValidationProblemDetails` con TODOS los errores y el service no se ejecuta.
   *
   * Semantica que el copy tiene que respetar: el silencio **arranca ahora** (el request solo trae el
   * `hasta`), **no borra senales**, **no detiene la deteccion** y **no pausa el reloj de SLA**.
   */
  silenciar: (problemaId: string, data: SilenciarProblemaRequest) =>
    httpClient.post<void>(`${BASE}/${problemaId}/silenciar`, data, configFlota),

  /**
   * POST /api/flota/problemas/{problemaId}/resolver -> **204 SIN CUERPO** | 400 | 404 | 409.
   * Permiso `flota.problemas.resolver`. Es el cierre **TERMINAL**.
   *
   * `resultado` solo admite `resuelto` | `descartado` (los 2 terminales del catalogo de 7) y
   * `evidencia` vacia da 400: es criterio de aceptacion del slice.
   *
   * ⚠️ `crearEventoCierreIntegracion` **se acepta y no dispara nada** (DA-IN-08 abierta). Si la
   * pantalla ofrece el toggle, tiene que decir que hoy no envia nada — mandarlo en `true` y callarlo
   * es prometer una integracion que no ocurre.
   */
  resolver: (problemaId: string, data: ResolverProblemaRequest) =>
    httpClient.post<void>(`${BASE}/${problemaId}/resolver`, data, configFlota),
}
