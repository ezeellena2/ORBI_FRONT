import { appConfig } from '@/config/env'
import { httpClient } from '@/services/http/http-client'
import type {
  ActualizarDispositivoRequest,
  CambiarEstadoStockRequest,
  DispositivoDetalleDto,
  DispositivoListItemDto,
  DispositivosPageQuery,
  DispositivoTelemetriaSnapshotDto,
  HistorialStockQuery,
  PagedResult,
  RegistrarDispositivoRequest,
  TransicionStockDto,
} from '@/services/contracts/flota'

/**
 * Cliente HTTP de la seccion §Dispositivos GPS de `Flota.Api`. Un metodo por endpoint del contrato.
 * Funciones puras: hacen HTTP y devuelven la respuesta. Sin estado, sin stores, sin React.
 *
 * Mismo patron que `vehiculos-service`: `baseURL` por request apunta a Flota (7213) y se reusa el
 * `httpClient` para heredar el interceptor de sesion (Bearer, 401 -> refresh -> retry,
 * Accept-Language) en vez de duplicar esa logica en otra instancia de axios.
 *
 * ── LO QUE ESTE SERVICIO NO EXPONE, Y POR QUE ──────────────────────────────────────────────────
 *  - `POST .../comandos` (ping / localizar / reiniciar): BLOQUEADO (B-12). Telemetria no expone
 *    endpoint de comandos y Flota tiene prohibido llamar a Traccar, asi que el stub responde
 *    SIEMPRE 500 `flota.telemetria.no_disponible`. Un metodo que solo puede fallar invita a
 *    cablearlo a un boton que simula exito, que es exactamente lo que el contrato prohibe.
 *  - `GET .../eventos`: superficie ⚠ DEGRADADA (A-1), responde siempre 500 con el mismo code.
 *  - `GET .../exportar`: **B-34**. La spec esta entera en `api.md` pero su unico camino de error
 *    (400 por >10.000 filas) no tiene `code`, y el backend PARO en vez de inventarlo: hoy es un 404
 *    de routing. La ausencia sigue anclada por test del lado del server.
 *  - `GET/PUT .../configuracion` y `GET .../qr-instalacion`: DEROGADOS del contrato el 2026-08-11
 *    (D-S3-22 / D-S3-23). No son "todavia no implementados": no estan contratados. Si aparece un
 *    boton "Configuracion" o "Ver QR" en un mockup, NO va.
 *
 * `DELETE .../{id}` (hard-delete) SI se expone: es la accion "Eliminar" del kebab del LISTADO
 * (`f-05` §7, gateada por `flota.dispositivos.eliminar` y oculta sin el permiso). No tiene
 * superficie en la pantalla de detalle. Es distinta de `POST .../baja`, que es logica y reversible.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

const BASE = '/api/flota/dispositivos'

const configFlota = { baseURL: appConfig.flotaApiBaseUrl } as const

export const dispositivosService = {
  /** GET /api/flota/dispositivos -> 200 PagedResult<DispositivoListItemDto> */
  listar: (query: DispositivosPageQuery = {}) =>
    httpClient.get<PagedResult<DispositivoListItemDto>>(BASE, {
      ...configFlota,
      params: query,
    }),

  /** GET /api/flota/dispositivos/{dispositivoId} -> 200 | 404 (404 tambien es cross-tenant) */
  obtener: (dispositivoId: string) =>
    httpClient.get<DispositivoDetalleDto>(`${BASE}/${dispositivoId}`, configFlota),

  /**
   * POST /api/flota/dispositivos -> 201 DispositivoDetalleDto.
   *
   * Errores que la UI distingue POR `code`, nunca por status:
   *  - 409 `flota.dispositivo.imei_duplicado` — ya hay un dispositivo ACTIVO con ese IMEI.
   *  - 404 `flota.dispositivo.canonico_no_existe` — el IMEI no resuelve en el canonico (Modo A).
   *  - 404 `flota.dispositivo.modelo_no_existe` / `...proveedor_sim_no_existe` — el uuid del
   *    catalogo no existe O es de otra organizacion (404 y no 400: decir "existe pero no es tuyo"
   *    filtraria existencia ajena).
   *  - 500 `flota.dispositivo.canonico_no_coordinable` — la coordinacion con el Canonico no llego a
   *    destino. Es REINTENTABLE; nada quedo escrito.
   */
  registrar: (data: RegistrarDispositivoRequest) =>
    httpClient.post<DispositivoDetalleDto>(BASE, data, configFlota),

  /**
   * PATCH /api/flota/dispositivos/{dispositivoId} -> 200 | 404 `flota.dispositivo.no_existe` |
   * 404 `flota.dispositivo.modelo_no_existe` / `...proveedor_sim_no_existe`.
   *
   * `flota.dispositivo.alias_duplicado` NO TIENE EMISOR en v1 (D-S3-34): no hay indice unico sobre
   * `alias`. No ramificar por ese `code` hasta que el PO cierre B-15.
   */
  actualizar: (dispositivoId: string, data: ActualizarDispositivoRequest) =>
    httpClient.patch<DispositivoDetalleDto>(`${BASE}/${dispositivoId}`, data, configFlota),

  /**
   * POST /api/flota/dispositivos/{dispositivoId}/estado-stock -> **204 SIN CUERPO** | 404 |
   * 409 `flota.dispositivo.transicion_stock_invalida` |
   * 409 `flota.dispositivo.reparacion_con_asignacion_activa` (destino `en_reparacion` con el GPS
   * todavia instalado: primero desasignar).
   *
   * ⚠️ Los 3 endpoints de abajo (este, `baja` y `reactivar`) devuelven **`NoContent()`**, y este
   * archivo los tipaba `DispositivoDetalleDto`. Con axios, el cuerpo de un 204 es el **string
   * vacio**: quien hiciera `setQueryData(detalle, respuesta.data)` sembraba `''` donde va el DTO.
   * Verificado contra `DispositivosController` (`CambiarEstadoStock`, `DarDeBaja`, `Reactivar`).
   */
  cambiarEstadoStock: (dispositivoId: string, data: CambiarEstadoStockRequest) =>
    httpClient.post<void>(`${BASE}/${dispositivoId}/estado-stock`, data, configFlota),

  /**
   * POST /api/flota/dispositivos/{dispositivoId}/baja -> **204 SIN CUERPO** | 404 |
   * 409 `flota.dispositivo.baja_con_asignacion_activa` (instalado: primero desasociar).
   * Es baja LOGICA y coherente (`activo=false` + `estado_stock='dado_de_baja'`), y es REVERSIBLE.
   *
   * ⚠️ **Despues de la baja, `GET /dispositivos/{id}` responde 404**: el detalle se lee por
   * `ObtenerConCatalogos`, que NO aplica `IgnoreQueryFilters()`, y el query filter global de
   * `DispositivoGpsConfiguration` es `x => x.Activo`. O sea que la ficha no puede seguir mostrando
   * el equipo dado de baja. Quien llame a esto desde el detalle tiene que sacar al usuario de ahi.
   */
  darDeBaja: (dispositivoId: string) =>
    httpClient.post<void>(`${BASE}/${dispositivoId}/baja`, undefined, configFlota),

  /**
   * POST /api/flota/dispositivos/{dispositivoId}/reactivar -> **204 SIN CUERPO** | 404 |
   * 409 `flota.dispositivo.imei_duplicado`.
   *
   * El 409 no es un error tecnico: el indice unico del IMEI es PARCIAL sobre `activo`, asi que la
   * baja LIBERA el IMEI y otro dispositivo pudo tomarlo mientras este estaba de baja (D-S3-11).
   *
   * ⚠️ **Hoy este metodo no tiene ninguna superficie alcanzable**, y no es olvido del front: las 2
   * que lo ofrecen (el menu de la ficha y el toggle del modal de edicion) necesitan el
   * `DispositivoDetalleDto`, que para un equipo dado de baja responde 404 por lo dicho arriba. Es un
   * pendiente de LECTURA del backend, anotado en `ESTADO.md`; el conductor no lo tiene porque su
   * "Reactivar" cuelga del kebab de la FILA del listado, que solo necesita el id.
   */
  reactivar: (dispositivoId: string) =>
    httpClient.post<void>(`${BASE}/${dispositivoId}/reactivar`, undefined, configFlota),

  /**
   * GET /api/flota/dispositivos/{dispositivoId}/historial-stock ->
   * 200 PagedResult<TransicionStockDto> | 404.
   *
   * ⚠️ ESTA IMPLEMENTADO y tiene tabla (`transiciones_stock_dispositivo_flota`). El "sin fuente" que
   * la ficha de detalle todavia dibuja en su tab quedo viejo.
   */
  listarHistorialStock: (dispositivoId: string, query: HistorialStockQuery = {}) =>
    httpClient.get<PagedResult<TransicionStockDto>>(`${BASE}/${dispositivoId}/historial-stock`, {
      ...configFlota,
      params: query,
    }),

  /**
   * GET /api/flota/dispositivos/{dispositivoId}/telemetria -> **200** DispositivoTelemetriaSnapshotDto
   * | 404 `flota.dispositivo.no_existe`. Permiso `flota.dispositivos.leer`.
   *
   * ⚠️ ESTA IMPLEMENTADO desde slice-05 `f-04` (2026-08-12). El docblock de este archivo afirmaba lo
   * contrario ("NO ESTA IMPLEMENTADO … llamarlo hoy es un 404 de routing") y la ficha dibujaba un
   * "sin fuente" por eso: las dos cosas quedaron falsas.
   *
   * ⚠️ Es **PARTIAL-DATA (convencion 8a), NO una superficie degradada**: responde 200 con los campos
   * sin fuente en `null`, nunca 500. La lista de superficies que responden 500
   * `flota.telemetria.no_disponible` es cerrada y esta NO esta en ella — tratarla como "sin fuente"
   * y no llamarla es perderse el unico dato tecnico que hoy existe del equipo.
   *
   * Que llega `null`, y por que ninguna de las 3 razones es un fallo:
   *  - `uptime`: SIEMPRE (D-S3-28). Exige historico de posiciones, que Telemetria no persiste (B-9).
   *  - `bateriaInterna` / `bateriaVehiculo`: salen de `resumen-tecnico`, que es POR VEHICULO. Un GPS
   *    sin vehiculo no tiene de donde sacarlas, y en ese caso el backend ni siquiera pide el resumen.
   *  - `velocidadKmh` / `ultimaSenalUtc`: salen del estado por organizacion indexado por dispositivo,
   *    asi que los tiene incluso un equipo sin vehiculo. `null` = no hay fila upstream.
   */
  obtenerTelemetria: (dispositivoId: string) =>
    httpClient.get<DispositivoTelemetriaSnapshotDto>(
      `${BASE}/${dispositivoId}/telemetria`,
      configFlota,
    ),

  /**
   * DELETE /api/flota/dispositivos/{dispositivoId} -> 204 | 404 | 409.
   *
   * HARD-DELETE, no baja logica: la fila desaparece y NO se puede deshacer. El contrato solo lo
   * permite sin dependencias ni historial; con dependencias devuelve 409
   * (`flota.dispositivo.baja_con_asignacion_activa` si esta instalado en un vehiculo).
   */
  eliminar: (dispositivoId: string) =>
    httpClient.delete<void>(`${BASE}/${dispositivoId}`, configFlota),
}
