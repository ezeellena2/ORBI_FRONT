import { describe, expect, it } from 'vitest'
import type { WebhookEndpointDto } from '@/services/contracts/flota'
import {
  aActualizarWebhookRequest,
  aCrearWebhookRequest,
  aFormularioDeWebhook,
  webhookEndpointSchema,
  type WebhookEndpointFormulario,
} from './webhook-endpoint'

const valores: WebhookEndpointFormulario = {
  nombre: '  maintenance-api  ',
  url: '  https://ops.example.com/orbi/webhooks  ',
  activo: true,
}

describe('validacion del formulario de webhook', () => {
  it('acepta una URL https', () => {
    expect(webhookEndpointSchema.safeParse(valores).success).toBe(true)
  })

  /**
   * El anti-SSRF completo es del server (necesita DNS) y tiene `code` propio. Acá se adelanta **solo
   * el esquema**, que es lo unico verificable sin red, y con **el mismo copy**: el mensaje de Zod es
   * la clave del catalogo de errores, asi que el usuario lee el mismo texto venga del cliente o del
   * 400. Un mensaje propio habria creado 2 verdades para la misma regla.
   */
  it('rechaza http con la MISMA clave i18n que el 400 del backend', () => {
    const resultado = webhookEndpointSchema.safeParse({ ...valores, url: 'http://ops.example.com' })

    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues[0]?.message).toBe('errors.flota.webhook.url_no_permitida')
  })

  it('rechaza nombre y URL vacios con las claves que emite el validador del backend', () => {
    const sinNombre = webhookEndpointSchema.safeParse({ ...valores, nombre: '   ' })
    expect(sinNombre.error?.issues[0]?.message).toBe('validation.nombre.required')

    const sinUrl = webhookEndpointSchema.safeParse({ ...valores, url: '' })
    expect(sinUrl.error?.issues[0]?.message).toBe('validation.url.required')
  })

  it('rechaza un nombre por encima del maximo del backend (200)', () => {
    const resultado = webhookEndpointSchema.safeParse({ ...valores, nombre: 'x'.repeat(201) })

    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues[0]?.message).toBe('validation.nombre.max_length')
  })
})

describe('mapeo a los requests', () => {
  it('el alta trimea nombre y URL', () => {
    expect(aCrearWebhookRequest(valores)).toEqual({
      nombre: 'maintenance-api',
      url: 'https://ops.example.com/orbi/webhooks',
      activo: true,
    })
  })

  /**
   * ⚠️ El request **no declara `eventos[]` ni `scopes[]`** y el mapeo tampoco los inventa: no tienen
   * donde persistirse (PENDIENTE #3). El endpoint nace **sin suscripciones**, y eso es fail-closed
   * declarado — no un descuido del formulario.
   */
  it('el alta no manda eventos ni scopes', () => {
    const request: Record<string, unknown> = { ...aCrearWebhookRequest(valores) }

    expect(request.eventos).toBeUndefined()
    expect(request.scopes).toBeUndefined()
  })

  it('la edicion manda los 3 campos: el `PATCH` no puede borrar y reenviar el actual es un no-op', () => {
    expect(aActualizarWebhookRequest({ ...valores, activo: false })).toEqual({
      nombre: 'maintenance-api',
      url: 'https://ops.example.com/orbi/webhooks',
      activo: false,
    })
  })
})

describe('aFormularioDeWebhook', () => {
  it('precarga los 3 campos editables y descarta lo que no se edita', () => {
    const endpoint: WebhookEndpointDto = {
      id: 'w1',
      nombre: 'support-desk',
      url: 'https://soporte.example.com/hook',
      activo: false,
      eventos: [],
      scopes: [],
      firmaHmacActiva: true,
      // El secreto NUNCA vuelve por un GET: solo su huella, y no entra al formulario.
      secretoHuella: 'whsec_9f2a',
      ultimoEnvioUtc: '2026-08-15T10:00:00Z',
      ultimoEstado: 'fallido',
    }

    expect(aFormularioDeWebhook(endpoint)).toEqual({
      nombre: 'support-desk',
      url: 'https://soporte.example.com/hook',
      activo: false,
    })
  })
})
