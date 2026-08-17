import { httpClient } from '@/services/http/http-client'
import type {
  ActualizarWebhookEndpointRequest,
  CrearWebhookEndpointRequest,
  PagedResult,
  ResultadoPruebaWebhookDto,
  ResultadoReintentoWebhookDto,
  SecretoWebhookDto,
  WebhookEndpointDto,
  WebhookEntregaDto,
  WebhooksPageQuery,
} from '@/services/contracts/flota'

/**
 * Cliente HTTP de la seccion §Integraciones (webhooks salientes) — `IntegracionesController`,
 * slice-06 `f-04`. Las **8 filas del contrato, completas**.
 *
 * Es la **unica superficie de Flota que manda datos AFUERA de la plataforma**, y por eso el cierre
 * de slice-06 le dedico una lente de seguridad entera. Lo que quedo de ese trabajo y que la pantalla
 * tiene que respetar esta abajo.
 *
 * ══ EL SECRETO SALE UNA SOLA VEZ ════════════════════════════════════════════════════════════════
 * Solo por 2 puertas: la respuesta del **alta** y la de **rotar-secreto**. **Ningun `GET` lo
 * devuelve** — el listado expone `secretoHuella` (prefijo mostrable) y nada mas.
 *
 * ⚠️ Consecuencia de UI que hay que resolver ANTES y no despues: el modal tiene que avisar que el
 * valor no se va a poder volver a ver **antes de que el usuario pueda cerrarlo**. Y el secreto
 * **no se persiste** en ningun store ni se loguea.
 *
 * ══ ROTAR NO ES GRATIS HOY (B-39) ═══════════════════════════════════════════════════════════════
 * `api.md` §Rotacion promete una **ventana de gracia**: el secreto anterior sigue validando para que
 * el receptor despliegue el cambio sin perder entregas. **Hoy eso es falso.** Flota firma con el
 * nuevo desde t=0 y manda **una sola** firma en `X-Orbi-Signature`; el secreto viejo queda con
 * `vigente_hasta` futuro y **ningun camino de produccion lo lee**. Un receptor que todavia tiene el
 * viejo pierde el **100 %** de las entregas desde el instante de la rotacion.
 *
 * ⇒ La pantalla **NO debe mostrar** el copy "el anterior sigue funcionando" ni un numero de
 * duracion. `secretoAnteriorVigenteHastaUtc` llega poblado y es **dato inerte**.
 *
 * ══ UN ENDPOINT NACE SIN SUSCRIPCIONES (PENDIENTE #3, mitad de DA-IN-08) ════════════════════════
 * El alta y el `PATCH` **no aceptan `eventos[]` ni `scopes[]`**: no tienen donde persistirse. Es
 * **fail-closed y declarado** — el endpoint creado hoy **no recibe ninguna entrega automatica**. La
 * unica entrega que existe en todo el sistema es la explicita de `/probar`. **El fan-out no esta
 * construido.**
 *
 * ══ EL BOTON "REINTENTAR" NO SE DIBUJA (B-40) ═══════════════════════════════════════════════════
 * `POST .../reintentar` reencola de verdad (reprograma `proximo_intento_utc`), pero **nadie drena la
 * cola** y no se puede cablear: la fila guarda el **hash** del payload, no el cuerpo, y no existe
 * vinculo entrega -> hecho de negocio. El 200 no miente sobre lo que hace; **si miente sobre lo que
 * va a pasar**. El metodo se expone porque el endpoint existe, pero ninguna pantalla debe ofrecerlo
 * hasta que B-40 cierre.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

const BASE = '/api/flota/integraciones/webhooks'

export const integracionesService = {
  /**
   * GET /api/flota/integraciones/webhooks -> 200 `PagedResult<WebhookEndpointDto>`.
   * Permiso `flota.integraciones.leer`. ORDER BY fecha de creacion DESC, id DESC; sin filtros.
   *
   * **Nunca trae el secreto**, solo `secretoHuella`. `eventos` y `scopes` llegan **siempre vacios**
   * (PENDIENTE #3): es la contracara de que el alta no los acepte, no un endpoint recien creado.
   */
  listarEndpoints: (query: WebhooksPageQuery = {}) =>
    httpClient.get<PagedResult<WebhookEndpointDto>>(BASE, {
      params: query,
    }),

  /**
   * POST /api/flota/integraciones/webhooks -> **200 `SecretoWebhookDto`** (no 201) |
   * 400 `flota.webhook.url_no_permitida`. Permiso `flota.integraciones.gestionar`.
   *
   * El cuerpo **no es el recurso**: es el secreto de una sola lectura, que es lo que el usuario
   * tiene que copiar antes de cerrar el modal. Para ver el endpoint hay que refrescar el listado
   * (`api.md` no declara `GET /webhooks/{id}`).
   *
   * La `url` pasa por **anti-SSRF**: exige `https`, rechaza IP literal privada/loopback/link-local y
   * hostname que resuelva a rango privado. El error llega con `args {url}` y es de **campo**, no de
   * pantalla: va al input de la URL.
   */
  crearEndpoint: (data: CrearWebhookEndpointRequest) =>
    httpClient.post<SecretoWebhookDto>(BASE, data),

  /**
   * PATCH /api/flota/integraciones/webhooks/{webhookId} -> **204 SIN CUERPO** |
   * 400 `flota.webhook.url_no_permitida` | 404 `flota.webhook.no_existe`.
   * Permiso `flota.integraciones.gestionar`.
   *
   * `activo: false` **pausa** el endpoint sin borrarlo (es la columna `habilitado`). Cambiar la URL
   * la revalida anti-SSRF. No borra campos (B-18): lo ausente se preserva.
   */
  actualizarEndpoint: (webhookId: string, data: ActualizarWebhookEndpointRequest) =>
    httpClient.patch<void>(`${BASE}/${webhookId}`, data),

  /**
   * DELETE /api/flota/integraciones/webhooks/{webhookId} -> **204** | 404.
   * Permiso `flota.integraciones.gestionar`.
   *
   * Es **baja LOGICA**: la fila sigue existiendo y deja de recibir entregas, como toda baja del
   * modulo. El log de entregas ya emitidas **no se toca** — es la auditoria de a donde salio cada
   * payload. El copy de la confirmacion no debe decir "se borra el historial".
   */
  eliminarEndpoint: (webhookId: string) =>
    httpClient.delete<void>(`${BASE}/${webhookId}`),

  /**
   * POST /api/flota/integraciones/webhooks/{webhookId}/probar -> 200 `ResultadoPruebaWebhookDto` |
   * 404. Permiso `flota.integraciones.gestionar` (**no es una lectura**: sale una request firmada al
   * sistema del cliente).
   *
   * Prueba contra la **URL real**, con el **secreto real** y los mismos 4 headers
   * (`X-Orbi-Signature` · `X-Orbi-Event-Id` · `X-Orbi-Event-Type` · `X-Orbi-Timestamp`).
   *
   * **Invariante de efecto secundario cero**: no genera problema operativo, no entra al motor de
   * reglas, no abre alerta y no publica nada al bus interno. Lo unico que produce es **una** fila de
   * entrega. ⇒ **probar no marca al endpoint como sano**, y la pantalla tiene que decirlo.
   *
   * ⚠️ Devuelve **200 aunque el receptor haya fallado**: el resultado de la prueba es un dato, no un
   * error de la API. Se lee en `entrega.estado` + `entrega.httpStatus` + `entrega.errorResumen`.
   * Ramificar por status HTTP de la llamada perderia el unico caso interesante.
   */
  probar: (webhookId: string) =>
    httpClient.post<ResultadoPruebaWebhookDto>(`${BASE}/${webhookId}/probar`, undefined),

  /**
   * POST /api/flota/integraciones/webhooks/{webhookId}/reintentar -> 200
   * `ResultadoReintentoWebhookDto` | 404. Permiso `flota.integraciones.gestionar`.
   *
   * ⚠️ **NO CABLEAR A UN BOTON — B-40.** Reprograma las entregas fallidas / en reintento del
   * endpoint y devuelve cuantas reencolo, y hasta ahi es cierto. Lo que no es cierto es la promesa
   * implicita: **nadie drena esa cola** y el cuerpo original **no es reconstruible** (la fila guarda
   * el hash, `api.md` §Logs pide "probar que se envio sin guardar el cuerpo"). Una entrega fallida
   * queda en `reintentando` para siempre.
   *
   * ⚠️ Ademas, **reencolar no cuenta como intento** y no manda la request en el acto.
   *
   * El metodo se expone porque el endpoint existe y esta contratado; la decision de no ofrecerlo es
   * de la pantalla y esta escrita en `CAPACIDADES_BLOQUEADAS_DEL_CENTRO`.
   */
  reintentar: (webhookId: string) =>
    httpClient.post<ResultadoReintentoWebhookDto>(
      `${BASE}/${webhookId}/reintentar`,
      undefined,
    ),

  /**
   * POST /api/flota/integraciones/webhooks/{webhookId}/rotar-secreto -> 200 `SecretoWebhookDto` |
   * 404. Permiso `flota.integraciones.gestionar`.
   *
   * Devuelve el secreto nuevo **una sola vez**. Despues, la pantalla solo muestra `secretoHuella`.
   * **Nunca se loguea** el valor devuelto.
   *
   * ⚠️ Ver el bloque **B-39** del encabezado antes de escribir el copy: `secretoAnteriorVigenteHasta
   * Utc` llega poblado y **no compra nada** — rotar hoy corta las entregas del receptor viejo en el
   * acto. El aviso correcto es "coordina el despliegue del receptor", no "tenes una ventana".
   */
  rotarSecreto: (webhookId: string) =>
    httpClient.post<SecretoWebhookDto>(`${BASE}/${webhookId}/rotar-secreto`, undefined),

  /**
   * GET /api/flota/integraciones/webhooks/entregas -> 200 `PagedResult<WebhookEntregaDto>`.
   * Permiso `flota.integraciones.leer`. ORDER BY fecha de entrega DESC, id DESC.
   *
   * ⚠️ Es de **TODA la organizacion**, no de un endpoint: `api.md` declara la ruta sin `{webhookId}`
   * y **no le da ningun filtro**. "Ver entregas de este webhook" se resuelve filtrando por
   * `webhookEndpointId` sobre lo que ya llego, y la pantalla tiene que rotularlo como tal — mandar
   * un query param que el contrato no nombra devuelve la lista entera sin filtrar.
   *
   * La ruta literal `entregas` no colisiona con `{webhookId:guid}`: no es un guid.
   */
  listarEntregas: (query: WebhooksPageQuery = {}) =>
    httpClient.get<PagedResult<WebhookEntregaDto>>(`${BASE}/entregas`, {
      params: query,
    }),
}
