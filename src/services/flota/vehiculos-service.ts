import { appConfig } from '@/config/env'
import { httpClient } from '@/services/http/http-client'
import type {
  ActualizarVehiculoRequest,
  AsignacionVehiculoConductorDto,
  AsignacionVehiculoDispositivoDto,
  AsignarConductorRequest,
  AsignarDispositivoRequest,
  CrearVehiculoRequest,
  DesasignarConductorRequest,
  DesasignarDispositivoRequest,
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

  /**
   * POST /api/flota/vehiculos/{vehiculoFlotaId}/asignaciones/dispositivo -> 200
   * `AsignacionVehiculoDispositivoDto`. Permiso `flota.vehiculos.asignar-dispositivo` (grupo
   * VEHICULOS, no dispositivos: asignar es una operacion del vehiculo).
   *
   * ⚠️ LA RESPUESTA ES LA UNICA FUENTE DEL `asignacionId` (D-S3-16), y el `DELETE` lo pide en la
   * URL: `GET /vehiculos/{id}/asignaciones` no esta implementado y `historialAsignaciones` no lo
   * lleva. Un caller que descarta esta respuesta deja al usuario sin forma de desasignar.
   *
   * Reasignar NO es un error: si el vehiculo ya tiene GPS, el backend cierra la anterior con
   * `motivo_cierre = reasignacion` y devuelve el saliente a `en_stock` (D-S3-14).
   *
   * Errores que se distinguen POR `code`:
   *  - 409 `flota.dispositivo.no_disponible` (`args {estadoActual}`) — el GPS no esta `en_stock`.
   *  - 409 `flota.vehiculo.ya_tiene_dispositivo` — carrera: otro usuario le colgo un GPS al mismo
   *    vehiculo un instante antes.
   *  - 409 `flota.asignacion.canonico_inactivo` — un extremo canonico esta inactivo. NO reintentable.
   *  - 409 `flota.vehiculo.conflicto_canonico` — el vehiculo canonico ya tiene otro GPS colgado.
   *  - 404 `flota.dispositivo.canonico_no_existe` — el par no resuelve del lado del Canonico.
   *  - 500 `flota.dispositivo.canonico_no_coordinable` — la coordinacion no llego a destino. SI es
   *    reintentable y NO quedo nada escrito (D-S3-13): nunca 200 con la mitad hecha.
   */
  asignarDispositivo: (vehiculoFlotaId: string, data: AsignarDispositivoRequest) =>
    httpClient.post<AsignacionVehiculoDispositivoDto>(
      `${BASE}/${vehiculoFlotaId}/asignaciones/dispositivo`,
      data,
      configFlota,
    ),

  /**
   * DELETE /api/flota/vehiculos/{vehiculoFlotaId}/asignaciones/dispositivo/{asignacionId} -> 204.
   * Mismo permiso que el `POST`.
   *
   * Body OPCIONAL con `motivo` (codigo del catalogo, no texto libre). Sin body -> `otro` (D-S3-15).
   *
   * Una `asignacionId` de OTRO vehiculo -> 404 `flota.recurso.organizacion_invalida`; inexistente,
   * de otra organizacion o YA CERRADA -> 404 `flota.asignacion.no_existe` (cerrar dos veces
   * reescribiria historia, y el contrato no tiene un 409 para "esto ya paso").
   */
  desasignarDispositivo: (
    vehiculoFlotaId: string,
    asignacionId: string,
    data?: DesasignarDispositivoRequest,
  ) =>
    httpClient.delete<void>(
      `${BASE}/${vehiculoFlotaId}/asignaciones/dispositivo/${asignacionId}`,
      { ...configFlota, data },
    ),

  /**
   * POST /api/flota/vehiculos/{vehiculoFlotaId}/asignaciones/conductor -> 200
   * `AsignacionVehiculoConductorDto`. Permiso `flota.vehiculos.asignar-conductor` (grupo VEHICULOS,
   * no conductores: asignar es una operacion del vehiculo).
   *
   * ⚠️ A DIFERENCIA de `asignarDispositivo`, NO COORDINA CON PLATAFORMACANONICA. Es la lectura
   * correcta del contrato (ninguna frontera declara un write canonico de conductor), pero tiene una
   * consecuencia SILENCIOSA que la UI no debe tapar (B-20, abierta): el Canonico sigue respondiendo
   * "este vehiculo no tiene conductor principal" y **Notificaciones no le avisa al conductor**. No
   * prometer un aviso que nadie manda.
   *
   * ⚠️ EL PRINCIPAL NO SE REASIGNA SOLO: "cambiar conductor" es DELETE de la vigente + POST de la
   * nueva, **2 requests sin atomicidad**. Si el POST falla, la UI no puede dejar el vehiculo sin
   * conductor en silencio: muestra el error y ofrece reintentar.
   *
   * Asignar tampoco pasa al conductor a `en_servicio`: eso es una transicion explicita por
   * `POST /conductores/{id}/estado`.
   *
   * Errores que se distinguen POR `code`, los 3 en 409:
   *  - `flota.conductor.suspendido_no_asignable` — estado `suspendido` en DB.
   *  - `flota.conductor.licencia_vencida` — solo `vencido` bloquea; `por_vencer` avisa y
   *    `sin_cargar` NO bloquea (el contrato no tiene code para "todavia no cargo la licencia").
   *  - `flota.vehiculo.ya_tiene_principal` — el unico cupo de principal del vehiculo esta ocupado.
   *    Sale del choque real del indice unico parcial (23505), no de un check-then-act.
   *
   * `secundario` NO tiene restriccion de unicidad en v1: el indice parcial es solo del principal.
   */
  asignarConductor: (vehiculoFlotaId: string, data: AsignarConductorRequest) =>
    httpClient.post<AsignacionVehiculoConductorDto>(
      `${BASE}/${vehiculoFlotaId}/asignaciones/conductor`,
      data,
      configFlota,
    ),

  /**
   * DELETE /api/flota/vehiculos/{vehiculoFlotaId}/asignaciones/conductor/{asignacionId} -> 204.
   * Mismo permiso que el `POST`. Body OPCIONAL con `motivo` (codigo del catalogo); sin body, `otro`.
   *
   * Una `asignacionId` de OTRO vehiculo -> 404 `flota.recurso.organizacion_invalida`; inexistente,
   * de otra organizacion o YA CERRADA -> 404 `flota.asignacion.no_existe`.
   *
   * ⚠️ EL `asignacionId` NO SE PUEDE DESCUBRIR desde el vehiculo: `GET /vehiculos/{id}/asignaciones`
   * no esta implementado (B-19) y `VehiculoDetalleDto.conductoresAsignados` viene vacio SIEMPRE (ver
   * §3 del contrato). Los 2 origenes reales son la respuesta del `POST` de esta sesion y
   * `GET /conductores/{conductorId}/asignaciones`, que SI esta implementado y SI lo trae.
   */
  desasignarConductor: (
    vehiculoFlotaId: string,
    asignacionId: string,
    data?: DesasignarConductorRequest,
  ) =>
    httpClient.delete<void>(`${BASE}/${vehiculoFlotaId}/asignaciones/conductor/${asignacionId}`, {
      ...configFlota,
      data,
    }),
}
