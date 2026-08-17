import { z } from 'zod'
import type {
  ActualizarWebhookEndpointRequest,
  CrearWebhookEndpointRequest,
  WebhookEndpointDto,
} from '@/services/contracts/flota'

/**
 * Schema del modal "Webhook" (alta / edicion) — `POST` y `PATCH /api/flota/integraciones/webhooks`.
 *
 * ══ ⚠️ ESTE MODAL **NO** ESTA BLOQUEADO — DESVIACION DECLARADA DE `f-11` PASO 8 ═════════════════
 * `f-11` paso 8 manda construirlo con **Eventos/Scopes deshabilitados y el submit deshabilitado**,
 * porque `CrearWebhookEndpointRequest` "exige `eventos[]` y `scopes[]`". Eso era cierto contra
 * `dtos.ts` y **dejo de serlo cuando el backend cerro** (2026-08-15): el request real es
 * `{ nombre, url, activo? }` y **el alta funciona**. `ESTADO.md` lo dice explicito — *"el alta de
 * endpoint SI se construyo: nace sin suscripciones, fail-closed"*—, y el orden de autoridad pone
 * `00-contrato/` por encima de `03-build/`.
 *
 * ⇒ El modal **guarda**, y lo que hay que decir es la consecuencia: el endpoint nace **sin
 * suscripciones** y **no va a recibir ninguna entrega automatica** (PENDIENTE #3). Un submit
 * deshabilitado habria dejado la pantalla sin su accion principal por un motivo vencido.
 *
 * ══ LOS 2 CONTROLES QUE NO EXISTEN ══════════════════════════════════════════════════════════════
 * **Eventos** y **Scopes**: el request no los acepta. No van deshabilitados ni con texto libre (el
 * mockup usa inputs libres, que son demo): **no van**, y la card "Eventos disponibles" del rail
 * explica que el catalogo existe y todavia no se puede suscribir a nada.
 *
 * ══ LA URL ══════════════════════════════════════════════════════════════════════════════════════
 * El backend valida `NotEmpty` de forma y deja el **anti-SSRF** para el service, con `code` propio
 * del catalogo (`flota.webhook.url_no_permitida`: exige `https`, rechaza IP privada / loopback /
 * link-local y hostname que resuelva a rango privado).
 *
 * Acá se adelanta **solo la mitad verificable sin DNS** (el esquema `https`) y **con el mismo copy
 * que el backend**: el mensaje de Zod es la clave `errors.flota.webhook.url_no_permitida`, asi que
 * el usuario lee el **mismo texto** venga del cliente o del 400. Escribir un mensaje propio habria
 * creado 2 verdades para la misma regla.
 */

/** `{{url}}` lo interpola el resolutor de errores; acá el cliente pasa la que se tipeo. */
const CLAVE_URL_NO_PERMITIDA = 'errors.flota.webhook.url_no_permitida'

export const NOMBRE_LARGO_MAXIMO = 200

export const webhookEndpointSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'validation.nombre.required')
    .max(NOMBRE_LARGO_MAXIMO, 'validation.nombre.max_length'),
  url: z
    .string()
    .trim()
    .min(1, 'validation.url.required')
    // Solo el esquema: el resto de la regla (rangos privados, resolucion de hostname) necesita DNS
    // y es del server. Adelantar `https` evita el round-trip mas comun sin duplicar la regla real.
    .refine((url) => url.toLowerCase().startsWith('https://'), CLAVE_URL_NO_PERMITIDA),
  activo: z.boolean(),
})

export type WebhookEndpointFormulario = z.infer<typeof webhookEndpointSchema>

export const VALORES_INICIALES_WEBHOOK: WebhookEndpointFormulario = {
  nombre: '',
  url: '',
  activo: true,
}

export function aFormularioDeWebhook(endpoint: WebhookEndpointDto): WebhookEndpointFormulario {
  return { nombre: endpoint.nombre, url: endpoint.url, activo: endpoint.activo }
}

export function aCrearWebhookRequest(
  valores: WebhookEndpointFormulario,
): CrearWebhookEndpointRequest {
  return { nombre: valores.nombre.trim(), url: valores.url.trim(), activo: valores.activo }
}

/**
 * ⚠️ **Los 3 campos viajan siempre**, aunque no hayan cambiado. No es descuido: el `PATCH` **no
 * puede borrar** (B-18, el service preserva con `??`), asi que mandar el valor actual es un no-op
 * del lado del server y evita tener que diffear el formulario para nada. Y **ninguno de los 3 admite
 * vacio**: el validador del `PATCH` los rechaza con el mismo 400 que el alta, asi que no hay caso de
 * "vaciar" que avisar (a diferencia del webhook de la regla, que si cae en B-18).
 */
export function aActualizarWebhookRequest(
  valores: WebhookEndpointFormulario,
): ActualizarWebhookEndpointRequest {
  return { nombre: valores.nombre.trim(), url: valores.url.trim(), activo: valores.activo }
}
