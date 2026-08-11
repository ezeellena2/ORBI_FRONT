import { appConfig } from '@/config/env'
import { httpClient } from '@/services/http/http-client'
import type {
  ActualizarDispositivoRequest,
  CambiarEstadoStockRequest,
  DispositivoDetalleDto,
  DispositivoListItemDto,
  DispositivosPageQuery,
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
 *  - `GET .../telemetria` (snapshot tecnico): la fila esta en `api.md` pero el endpoint NO ESTA
 *    IMPLEMENTADO (slice-05). Llamarlo hoy es un 404 de routing, sin `code`.
 *  - `GET .../exportar`: sin implementar, ausencia anclada por test en el backend.
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
   * POST /api/flota/dispositivos/{dispositivoId}/estado-stock -> 200 | 404 |
   * 409 `flota.dispositivo.transicion_stock_invalida` |
   * 409 `flota.dispositivo.reparacion_con_asignacion_activa` (destino `en_reparacion` con el GPS
   * todavia instalado: primero desasignar).
   */
  cambiarEstadoStock: (dispositivoId: string, data: CambiarEstadoStockRequest) =>
    httpClient.post<DispositivoDetalleDto>(
      `${BASE}/${dispositivoId}/estado-stock`,
      data,
      configFlota,
    ),

  /**
   * POST /api/flota/dispositivos/{dispositivoId}/baja -> 200 | 404 |
   * 409 `flota.dispositivo.baja_con_asignacion_activa` (instalado: primero desasociar).
   * Es baja LOGICA y coherente (`activo=false` + `estado_stock='dado_de_baja'`), y es REVERSIBLE.
   */
  darDeBaja: (dispositivoId: string) =>
    httpClient.post<DispositivoDetalleDto>(`${BASE}/${dispositivoId}/baja`, undefined, configFlota),

  /**
   * POST /api/flota/dispositivos/{dispositivoId}/reactivar -> 200 | 404 |
   * 409 `flota.dispositivo.imei_duplicado`.
   *
   * El 409 no es un error tecnico: el indice unico del IMEI es PARCIAL sobre `activo`, asi que la
   * baja LIBERA el IMEI y otro dispositivo pudo tomarlo mientras este estaba de baja (D-S3-11).
   */
  reactivar: (dispositivoId: string) =>
    httpClient.post<DispositivoDetalleDto>(
      `${BASE}/${dispositivoId}/reactivar`,
      undefined,
      configFlota,
    ),

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
   * DELETE /api/flota/dispositivos/{dispositivoId} -> 204 | 404 | 409.
   *
   * HARD-DELETE, no baja logica: la fila desaparece y NO se puede deshacer. El contrato solo lo
   * permite sin dependencias ni historial; con dependencias devuelve 409
   * (`flota.dispositivo.baja_con_asignacion_activa` si esta instalado en un vehiculo).
   */
  eliminar: (dispositivoId: string) =>
    httpClient.delete<void>(`${BASE}/${dispositivoId}`, configFlota),
}
