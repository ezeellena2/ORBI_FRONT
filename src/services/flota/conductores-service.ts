import { httpClient } from '@/services/http/http-client'
import type {
  ActualizarConductorRequest,
  AsignacionConductorDispositivoDto,
  AsignacionConductorHistorialDto,
  AsignarDispositivoConductorRequest,
  CambiarEstadoConductorRequest,
  CerrarVinculoConductorDispositivoRequest,
  ConductorDetalleDto,
  ConductorListItemDto,
  ConductoresPageQuery,
  CrearConductorRequest,
  DocumentoDto,
  HistorialConductorQuery,
  PagedResult,
  SubirDocumentoRequest,
} from '@/services/contracts/flota'

/**
 * Cliente HTTP de la seccion §Conductores de `Flota.Api`. Un metodo por endpoint del contrato.
 * Funciones puras: hacen HTTP y devuelven la respuesta. Sin estado, sin stores, sin React.
 *
 * Mismo patron que `vehiculos-service` y `dispositivos-service`: `baseURL` por request apunta a
 * Flota (7213) y se reusa el `httpClient` para heredar el interceptor de sesion (Bearer,
 * 401 -> refresh -> retry, Accept-Language) en vez de duplicar esa logica en otra instancia de axios.
 *
 * ── PERMISOS (columna de `api.md` §Conductores, transcripta sin interpretar) ───────────────────
 * `flota.conductores.leer` — listar, detalle, asignaciones, dispositivos.
 * `flota.conductores.crear` — alta.
 * `flota.conductores.editar` — PATCH, cambio de estado y REACTIVAR.
 * `flota.conductores.eliminar` — baja logica y hard-delete.
 * `flota.conductores.asignar-dispositivo` — vinculo conductor<->dispositivo.
 * `flota.conductores.gestionar-documentos` — los 3 endpoints de documentos, INCLUIDO EL `GET`.
 *
 * Las 2 filas contraintuitivas (P-F) estan asi a proposito: **listar documentos NO alcanza con
 * `leer`**, y **baja pide `eliminar` mientras reactivar pide `editar`**.
 *
 * ── LO QUE ESTE SERVICIO NO EXPONE, Y POR QUE ─────────────────────────────────────────────────
 *  - `GET .../stats?periodo=` y `GET .../recorridos`: superficies ⚠ DEGRADADAS (A-1). Telemetria no
 *    modela conductores ni persiste historico de posiciones, asi que responden SIEMPRE 500
 *    `flota.telemetria.no_disponible` (convencion 8b). El stub existe para que el cliente reciba un
 *    `code` en vez de un 404 de routing — no para que se lo llame. Un metodo que solo puede fallar
 *    invita a cablearlo a una pantalla que despues muestra un error permanente.
 *  - `GET /conductores/exportar`: **B-34**, y ya no es "llega en slice-05" — slice-05 CERRO sin
 *    construirlo. La spec esta entera en `api.md` (CSV `;`, respeta filtros, permiso `.leer`), pero
 *    su UNICO camino de error —400 por mas de 10.000 filas— **no tiene `code`**, y el backend paro en
 *    vez de inventarlo. Hoy la ruta es un 404 de routing: por eso el listado no dibuja el boton
 *    Exportar aunque `f-06` paso 7 lo pida.
 *  - `POST /conductores/importar`: **P4** abierta (shape del resultado, `code` por fila y transporte
 *    del CSV, que en v1 no puede ser binario por D-C2). Tampoco lo tomo slice-05.
 *  - Infracciones: fuera de alcance v1, cero endpoints.
 *
 * La asignacion vehiculo<->conductor NO esta aca: cuelga del VEHICULO (`api.md` §Asignaciones) y
 * vive en `vehiculos-service`, igual que su gemela de dispositivo.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

const BASE = '/api/flota/conductores'

export const conductoresService = {
  /**
   * GET /api/flota/conductores -> 200 PagedResult<ConductorListItemDto>.
   * Default de orden: `Nombre` **asc** (el unico listado del modulo que no arranca en Desc).
   */
  listar: (query: ConductoresPageQuery = {}) =>
    httpClient.get<PagedResult<ConductorListItemDto>>(BASE, {
      params: query,
    }),

  /**
   * GET /api/flota/conductores/{conductorId} -> 200 | 404 `flota.conductor.no_existe`.
   *
   * El 404 es UNIFORME: "no existe" y "es de otra organizacion" son indistinguibles a proposito (el
   * filtro por `OrganizacionId` va en el WHERE). Nunca 403 para cross-tenant.
   */
  obtener: (conductorId: string) =>
    httpClient.get<ConductorDetalleDto>(`${BASE}/${conductorId}`),

  /**
   * POST /api/flota/conductores -> 201 ConductorDetalleDto.
   *
   * Modo A (`personaId`) o Modo B (`persona` por documento) — exactamente uno. El Modo B es el
   * camino real y ya no degrada.
   *
   * Errores que la UI distingue POR `code`, nunca por status:
   *  - 404 `flota.conductor.persona_no_existe` — Modo A: esa persona no esta proyectada en la org.
   *  - 409 `flota.conductor.persona_ya_es_conductor` — el indice es PARCIAL sobre `activo`: un
   *    conductor dado de baja NO ocupa a la persona.
   *  - 400 `flota.conductor.datos_canonicos_invalidos` — el Canonico rechazo el documento. NO
   *    reintentable con los mismos datos.
   *  - 500 `flota.conductor.canonico_no_creable` — la coordinacion no llego a destino. SI es
   *    reintentable y NO quedo nada escrito.
   */
  crear: (data: CrearConductorRequest) =>
    httpClient.post<ConductorDetalleDto>(BASE, data),

  /**
   * PATCH /api/flota/conductores/{conductorId} -> 200 ConductorDetalleDto | 404.
   * Solo datos operativos: la identidad de la Persona es proyeccion canonica read-only (P-A).
   */
  actualizar: (conductorId: string, data: ActualizarConductorRequest) =>
    httpClient.patch<ConductorDetalleDto>(`${BASE}/${conductorId}`, data),

  /**
   * POST /api/flota/conductores/{conductorId}/estado -> **204 SIN CUERPO** | 404 | 409.
   *
   * Devuelve 204, no el detalle: quien necesite el estado nuevo invalida y vuelve a leer. Por eso el
   * hook no puede sembrar la cache con la respuesta.
   *
   * 409 `flota.conductor.transicion_invalida` (`args {estadoActual, estadoDestino}`) ·
   * 409 `flota.conductor.documento_vencido` (`args {tipoDocumento}`) al pasar a `en_servicio` con
   * documentacion obligatoria vencida o sin cargar.
   */
  cambiarEstado: (conductorId: string, data: CambiarEstadoConductorRequest) =>
    httpClient.post<void>(`${BASE}/${conductorId}/estado`, data),

  /**
   * POST /api/flota/conductores/{conductorId}/baja -> 204 | 404 | 409. Permiso `eliminar` (P-F).
   *
   * Baja LOGICA (`activo = false`), REVERSIBLE por `reactivar`. **No toca el estado operativo**: los
   * dos ejes son ortogonales (DA-CD2-19), asi que un conductor dado de baja conserva su estado.
   *
   * ⚠️ CON ASIGNACION VIGENTE **RECHAZA**, no desasigna: 409
   * `flota.conductor.baja_con_asignacion_activa` (de vehiculo O de dispositivo). `api.md` describe
   * la baja como "desasigna vehiculo activo" y `errores.md` define este code que la bloquea; el
   * backend resolvio el drift a favor de `errores.md` (dueno de los codes) y quedo REPORTADO para el
   * PO. El copy del modal NO debe prometer que desasigna.
   */
  darDeBaja: (conductorId: string) =>
    httpClient.post<void>(`${BASE}/${conductorId}/baja`, undefined),

  /**
   * POST /api/flota/conductores/{conductorId}/reactivar -> 204 | 404 | 409. Permiso `editar` (P-F).
   *
   * Es el unico endpoint que alcanza una fila que el query filter global esconde.
   *
   * El 409 `flota.conductor.persona_ya_es_conductor` no es un error tecnico: el indice unico es
   * PARCIAL sobre `activo`, asi que la baja LIBERA a la persona y mientras tanto pudieron dar de
   * alta otro conductor para ella (mismo caso que D-S3-11 con el IMEI).
   *
   * NO resetea el estado operativo: es la contracara de que la baja no lo movio.
   */
  reactivar: (conductorId: string) =>
    httpClient.post<void>(`${BASE}/${conductorId}/reactivar`, undefined),

  /**
   * DELETE /api/flota/conductores/{conductorId} -> 204 | 404 | 409. Permiso `eliminar`.
   *
   * HARD-DELETE, no baja logica: la fila desaparece y NO se puede deshacer. El contrato solo lo
   * permite SIN dependencias ni historial (asignaciones, vinculos, documentos); con dependencias
   * devuelve 409 `flota.recurso.tiene_dependencias` (`args {recurso}`).
   */
  eliminar: (conductorId: string) =>
    httpClient.delete<void>(`${BASE}/${conductorId}`),

  /**
   * GET /api/flota/conductores/{conductorId}/asignaciones ->
   * 200 PagedResult<AsignacionConductorHistorialDto> | 404.
   *
   * Historial COMPLETO (activas + cerradas), ORDER BY desde DESC + id DESC. El orden es fijo por
   * contrato: NO hay `sortBy`, solo paginacion.
   */
  listarAsignaciones: (conductorId: string, query: HistorialConductorQuery = {}) =>
    httpClient.get<PagedResult<AsignacionConductorHistorialDto>>(
      `${BASE}/${conductorId}/asignaciones`,
      { params: query },
    ),

  /**
   * GET /api/flota/conductores/{conductorId}/dispositivos ->
   * 200 PagedResult<AsignacionConductorDispositivoDto> | 404.
   *
   * Vinculos activos + historial (`activa` los distingue). Es ATRIBUCION, no fuente de posicion.
   */
  listarDispositivos: (conductorId: string, query: HistorialConductorQuery = {}) =>
    httpClient.get<PagedResult<AsignacionConductorDispositivoDto>>(
      `${BASE}/${conductorId}/dispositivos`,
      { params: query },
    ),

  /**
   * POST /api/flota/conductores/{conductorId}/dispositivos -> 200
   * AsignacionConductorDispositivoDto. Permiso `flota.conductores.asignar-dispositivo`.
   *
   * La respuesta trae el `asignacionId`, que es lo que el `DELETE` pide en la URL. Tambien se puede
   * leer del `GET` de arriba, a diferencia del gemelo vehiculo<->dispositivo (D-S3-16).
   */
  asignarDispositivo: (conductorId: string, data: AsignarDispositivoConductorRequest) =>
    httpClient.post<AsignacionConductorDispositivoDto>(
      `${BASE}/${conductorId}/dispositivos`,
      data,
    ),

  /**
   * DELETE /api/flota/conductores/{conductorId}/dispositivos/{asignacionId} -> 204 | 404.
   * Mismo permiso que el `POST`. Body OPCIONAL con `motivo` (codigo del catalogo, no texto libre);
   * sin body, el motivo es `otro`.
   *
   * Una `asignacionId` de OTRO conductor -> 404 `flota.recurso.organizacion_invalida`; inexistente,
   * de otra organizacion o YA CERRADA -> 404 `flota.asignacion.no_existe`.
   */
  cerrarVinculoDispositivo: (
    conductorId: string,
    asignacionId: string,
    data?: CerrarVinculoConductorDispositivoRequest,
  ) =>
    httpClient.delete<void>(`${BASE}/${conductorId}/dispositivos/${asignacionId}`, {
      data,
    }),

  /**
   * GET /api/flota/conductores/{conductorId}/documentos -> 200 **DocumentoDto[]** | 403 | 404.
   *
   * ⚠️ ARRAY PLANO, no `PagedResult<T>`: `api.md` no declara paginacion para esta fila. Es la unica
   * lectura del modulo exenta de la convencion 3, y lo esta por contrato.
   *
   * ⚠️ PIDE `flota.conductores.gestionar-documentos`, NO `leer` (P-F): un usuario que ve la ficha
   * puede recibir **403 en esta llamada sola**. La pantalla tiene que tratarlo por bloque, no como
   * forbidden de pagina.
   */
  listarDocumentos: (conductorId: string) =>
    httpClient.get<DocumentoDto[]>(`${BASE}/${conductorId}/documentos`),

  /**
   * POST /api/flota/conductores/{conductorId}/documentos -> 201 DocumentoDto | 400 | 403 | 404.
   *
   * ⚠️ `application/json`, NUNCA `multipart/form-data`: Flota no recibe binarios en v1 (D-C2).
   *
   * 400 `flota.documento.tipo_invalido` (`args {tipo}`) · 400 `flota.documento.url_no_permitida`
   * (`args {url}`, regla anti-SSRF). `flota.documento.archivo_excede_limite` NO TIENE EMISOR en v1:
   * no hay upload que exceda un limite.
   */
  cargarDocumento: (conductorId: string, data: SubirDocumentoRequest) =>
    httpClient.post<DocumentoDto>(`${BASE}/${conductorId}/documentos`, data),

  /**
   * DELETE /api/flota/conductores/{conductorId}/documentos/{documentoId} -> 204 | 403 | 404.
   *
   * Baja logica del documento. Un `documentoId` que existe en la organizacion pero cuelga de OTRO
   * conductor -> 404 `flota.recurso.organizacion_invalida`.
   *
   * NO borra nada en el destino de `urlExterna`: ese storage es de la organizacion, no de Flota. La
   * confirmacion no debe prometer que se borra el archivo.
   */
  eliminarDocumento: (conductorId: string, documentoId: string) =>
    httpClient.delete<void>(`${BASE}/${conductorId}/documentos/${documentoId}`),
}
