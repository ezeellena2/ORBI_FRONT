import type {
  PaginationMetadata,
  WebhookEndpointDto,
  WebhookEntregaDto,
} from '@/services/contracts/flota'
import { estadoDerivadoDeWebhook, type EstadoDerivadoWebhook } from './vocabulario-centro-problemas'

/**
 * Vocabulario de la pantalla de INTEGRACIONES (`f-11`).
 *
 * Es la unica superficie de Flota que **manda datos afuera de la plataforma**, y eso cambia el
 * criterio de lo que se puede afirmar en pantalla: un copy optimista acá no confunde a un operador,
 * **le rompe la integracion a un tercero**.
 *
 * ══ LAS 3 COSAS QUE ESTE ARCHIVO DECIDE ═════════════════════════════════════════════════════════
 *  1. **Que puede afirmar el filtrado**, que es client-side sobre una pagina (ficha §5);
 *  2. **que dice la health grid** cuando 2 de sus 3 numeros no tienen formula (DA-IN-04);
 *  3. **el material de onboarding de la firma HMAC**, que es contrato cerrado y se documenta literal.
 */

/* ══ 1. Filtros — client-side, y por eso hay que decir sobre que ═══════════════════════════════ */

/**
 * Los valores del filtro Estado son **los 6 codigos del badge derivado**, no una lista aparte.
 *
 * La ficha §5 propone 4 opciones (`Todos · Activo · Con reintentos · Con fallos`) que **no coinciden
 * con las 6 etiquetas** que el badge muestra (DA-IN-02). Filtrar por un vocabulario y mostrar otro
 * obliga al usuario a traducir: elige "Con fallos" y en la lista lee "Fallando". Se usa el del badge,
 * que es el que ya esta cerrado en el contrato y ya tiene copy.
 */
export const VALORES_FILTRO_ESTADO_WEBHOOK = [
  'activo',
  'sin_envios',
  'pendiente',
  'con_errores',
  'fallando',
  'inactivo',
] as const satisfies readonly EstadoDerivadoWebhook[]

export interface FiltrosDeWebhooks {
  /** Matchea nombre y URL. **No matchea eventos**: ver la nota de abajo. */
  readonly busqueda: string
  /** `''` = todos. Uno de los 6 codigos del badge derivado. */
  readonly estado: string
  readonly soloActivos: boolean
}

export const FILTROS_DE_WEBHOOKS_INICIALES: FiltrosDeWebhooks = {
  busqueda: '',
  estado: '',
  // Default `on`, como la ficha §5. Se apaga solo, sin tocarlo, si el usuario elige Estado (abajo).
  soloActivos: true,
}

/**
 * ⚠️ **NO existe filtro por EVENTO, y no es un recorte de alcance.**
 *
 * La ficha §5 lo pide agrupando por prefijo de dominio (Problemas / Vehiculos / …) sobre
 * `WebhookEndpointDto.eventos[]`, y ese array llega **vacio SIEMPRE** (PENDIENTE #3: el alta no
 * acepta `eventos[]` porque no hay donde persistirlos). O sea que toda opcion distinta de "Todos"
 * devolveria **cero resultados**, en toda organizacion y para siempre: es literalmente el "chip que
 * se manda y no filtra" que este modulo ya corrigio 2 veces (D-S3-33) y que B-17 volvio a dejar
 * afuera en las 2 bandejas del Centro.
 *
 * Vuelve solo cuando cierre DA-IN-08 y el alta acepte suscripciones.
 */
export const FILTRO_POR_EVENTO_DISPONIBLE = false

export function hayFiltrosDeWebhooksActivos(filtros: FiltrosDeWebhooks): boolean {
  return (
    filtros.busqueda.trim().length > 0 ||
    filtros.estado !== '' ||
    filtros.soloActivos !== FILTROS_DE_WEBHOOKS_INICIALES.soloActivos
  )
}

/**
 * Filtrado **client-side** sobre los endpoints ya cargados (ficha §5: el volumen por organizacion es
 * chico y el contrato no declara query params de filtro para este listado).
 *
 * ⚠️ **El estado PREVALECE sobre "Solo activos"**, igual que en la ficha de reglas §5. Sin esa
 * regla, elegir "Pausado" con el toggle prendido —que es su posicion inicial— devuelve **siempre
 * vacio**, y el usuario no tiene forma de saber cual de los 2 controles lo dejo sin resultados.
 *
 * ⚠️ La busqueda **no mira `eventos[]`** aunque la ficha lo pida: ese array viaja vacio siempre. Un
 * campo que nunca matchea no ensancha la busqueda, solo hace creer que se busco ahi.
 */
export function filtrarWebhooks(
  endpoints: readonly WebhookEndpointDto[],
  filtros: FiltrosDeWebhooks,
): WebhookEndpointDto[] {
  const busqueda = filtros.busqueda.trim().toLowerCase()

  return endpoints.filter((endpoint) => {
    if (busqueda.length > 0) {
      const texto = `${endpoint.nombre} ${endpoint.url}`.toLowerCase()
      if (!texto.includes(busqueda)) return false
    }

    if (filtros.estado !== '') {
      return estadoDerivadoDeWebhook(endpoint.activo, endpoint.ultimoEstado) === filtros.estado
    }

    return filtros.soloActivos ? endpoint.activo : true
  })
}

/**
 * ¿El filtrado alcanza a toda la organizacion, o solo a la pagina cargada?
 *
 * Es el mismo criterio que el resumen de reglas y por el mismo motivo: **si el listado entra en una
 * sola pagina, la pagina ES la organizacion** y no hay nada que aclarar. Con mas de una, el filtro
 * client-side responde "los que coinciden **y** cayeron en esta pagina", y eso tiene que estar
 * escrito — es la clase de media verdad por la que el Centro no dibuja su toolbar.
 */
export function elFiltradoEsDeLaPagina(paginacion: PaginationMetadata | null | undefined): boolean {
  return (paginacion?.totalPages ?? 1) > 1
}

/* ══ 2. Health grid ════════════════════════════════════════════════════════════════════════════ */

export interface SaludDeIntegraciones {
  readonly activos: number
  readonly total: number
  readonly esDeLaPagina: boolean
}

/**
 * La **unica** de las 3 tarjetas que tiene fuente: "Webhooks activos" sale del DTO.
 *
 * ⚠️ "Entregas 24 h / % exitosas" y "Fallos abiertos" van en `—`: **DA-IN-04 abierta** — ni la
 * formula ni la ventana estan definidas, y `GET /webhooks/entregas` devuelve una **pagina** del log
 * de toda la organizacion, asi que contar sobre ella daria un numero que cambia al paginar. Es la
 * misma trampa de B-35, y la respuesta es la misma: no se inventa el numero.
 *
 * ⚠️ La 4.ª tarjeta del mockup (API keys) **no se renderiza**: fase 2 (decision #5).
 */
export function saludDeIntegraciones(
  endpoints: readonly WebhookEndpointDto[],
  paginacion: PaginationMetadata | null | undefined,
): SaludDeIntegraciones {
  return {
    activos: endpoints.filter((endpoint) => endpoint.activo).length,
    total: paginacion?.totalItems ?? endpoints.length,
    esDeLaPagina: elFiltradoEsDeLaPagina(paginacion),
  }
}

/* ══ 3. Entregas ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Nombre del endpoint de una entrega.
 *
 * ⚠️ Devuelve `null` cuando el endpoint **no esta en la pagina cargada**, y eso pasa de verdad: el
 * log de entregas es de **toda la organizacion** (`api.md` declara la ruta sin `{webhookId}` y sin
 * filtros) mientras la lista de endpoints esta paginada, y ademas un endpoint dado de baja
 * (`DELETE` = baja logica) deja de aparecer en el listado y **sus entregas quedan** — el log es la
 * auditoria de a donde salio cada payload y no se toca.
 *
 * La UI **no debe pintar el uuid crudo** en ese caso: dice que no esta cargado.
 */
export function nombreDelEndpointDeLaEntrega(
  webhookEndpointId: string,
  endpoints: readonly WebhookEndpointDto[],
): string | null {
  return endpoints.find((endpoint) => endpoint.id === webhookEndpointId)?.nombre ?? null
}

/**
 * "Ver entregas de este endpoint" — filtrado **client-side sobre la pagina de entregas ya cargada**.
 *
 * `GET /webhooks/entregas` **no acepta ningun filtro** (`api.md` no le declara query params) y
 * mandar uno inventado devuelve la lista entera sin filtrar, con el usuario creyendo que filtro. Por
 * eso se resuelve acá y **la pantalla lo rotula**.
 */
export function filtrarEntregasPorEndpoint(
  entregas: readonly WebhookEntregaDto[],
  webhookEndpointId: string | null,
): WebhookEntregaDto[] {
  if (webhookEndpointId === null) return [...entregas]
  return entregas.filter((entrega) => entrega.webhookEndpointId === webhookEndpointId)
}

/* ══ 4. Acciones del kebab de un endpoint ══════════════════════════════════════════════════════ */

/**
 * Lo que el kebab de un webhook puede ofrecer.
 *
 * ── LAS 2 QUE NO ESTAN, Y POR QUE ─────────────────────────────────────────────────────────────
 *  - **"Reintentar ahora" / "Forzar"** (ficha §7): **B-40**. `POST .../reintentar` reencola de
 *    verdad, pero **nadie drena la cola** y el cuerpo original no es reconstruible (la fila guarda
 *    el hash, no el payload). El 200 seria cierto sobre lo que hace y falso sobre lo que va a pasar.
 *  - **"Ver error"**: `errorResumen` persiste la **constante `http_error`** desde el cierre de
 *    slice-06. Un detalle que dice lo mismo en todas las filas no diagnostica nada; el dato util es
 *    el `httpStatus`, que ya tiene columna en la tabla de entregas.
 *
 * ⚠️ `pausar` y `activar` son **mutuamente excluyentes** segun `activo`, igual que en reglas.
 */
export const ACCIONES_DE_WEBHOOK = [
  'editar',
  'probar',
  'verEntregas',
  'pausar',
  'activar',
  'eliminar',
] as const

export type AccionDeWebhook = (typeof ACCIONES_DE_WEBHOOK)[number]

/**
 * Las 2 de LECTURA (`verEntregas` es la unica hoy) se gatean con `.leer`, que la pantalla ya exigio;
 * las 5 mutadoras con `.gestionar`, en modo **disable con motivo** y nunca ocultas.
 */
export const ACCIONES_DE_WEBHOOK_DE_GESTION: readonly AccionDeWebhook[] = [
  'editar',
  'probar',
  'pausar',
  'activar',
  'eliminar',
]

export function accionesDeWebhook(endpoint: WebhookEndpointDto): readonly AccionDeWebhook[] {
  return ['editar', 'probar', 'verEntregas', endpoint.activo ? 'pausar' : 'activar', 'eliminar']
}

/** Clave i18n armada por concatenacion — la ancla `vocabularios-i18n.test.ts`. */
export function claveDeAccionDeWebhook(accion: AccionDeWebhook): string {
  return `centro.integraciones.accion.${accion}`
}

/* ══ 5. Firma HMAC — contrato cerrado, se documenta literal ════════════════════════════════════ */

/**
 * Los **4 headers** de toda entrega (`api.md` §Firma de webhooks). Son nombres de protocolo: **no se
 * traducen**, igual que los nombres publicos de evento.
 *
 * El **uso** de cada uno si es copy y vive en i18n: sin el, la card es una lista de 4 strings y el
 * integrador no sabe cual es el que dedupea y cual el que evita el replay.
 */
export const HEADERS_DE_FIRMA = [
  { nombre: 'X-Orbi-Signature', clave: 'centro.integraciones.firma.headerSignature' },
  { nombre: 'X-Orbi-Event-Id', clave: 'centro.integraciones.firma.headerEventId' },
  { nombre: 'X-Orbi-Event-Type', clave: 'centro.integraciones.firma.headerEventType' },
  { nombre: 'X-Orbi-Timestamp', clave: 'centro.integraciones.firma.headerTimestamp' },
] as const

/**
 * El string canonico, **textual**. Es lo que el receptor tiene que reproducir para validar, asi que
 * se muestra copiable y sin reformatear.
 *
 * ⚠️ `v1=` **es parte del valor** del header, no un prefijo decorativo: versiona el esquema de firma
 * sin romper receptores. Y se firma el **`rawBody` tal cual se transmite**, no una reserializacion
 * del JSON — un receptor que reserializa antes de firmar obtiene otro hash y rechaza todo.
 */
export const STRING_CANONICO_DE_FIRMA = 'v1=<hex-hmac-sha256(timestamp + "." + rawBody)>'

/**
 * ⚠️ **DA-IN-08-b**: la tolerancia del `X-Orbi-Timestamp` (minutos) y si el formato es Unix o ISO
 * **no estan definidos**. Es el unico hueco del esquema de firma; el resto (4 headers, string
 * canonico, `v1=`, `rawBody`) esta **cerrado** en `api.md`.
 *
 * Se muestra como dato ausente y nunca como un numero plausible: un integrador que implemente una
 * tolerancia inventada rechaza entregas legitimas o acepta replays.
 */
export const TOLERANCIA_DE_TIMESTAMP_DEFINIDA = false
