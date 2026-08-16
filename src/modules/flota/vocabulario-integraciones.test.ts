import { describe, expect, it } from 'vitest'
import type {
  PaginationMetadata,
  WebhookEndpointDto,
  WebhookEntregaDto,
} from '@/services/contracts/flota'
import {
  FILTROS_DE_WEBHOOKS_INICIALES,
  FILTRO_POR_EVENTO_DISPONIBLE,
  HEADERS_DE_FIRMA,
  STRING_CANONICO_DE_FIRMA,
  TOLERANCIA_DE_TIMESTAMP_DEFINIDA,
  VALORES_FILTRO_ESTADO_WEBHOOK,
  elFiltradoEsDeLaPagina,
  filtrarEntregasPorEndpoint,
  filtrarWebhooks,
  hayFiltrosDeWebhooksActivos,
  nombreDelEndpointDeLaEntrega,
  saludDeIntegraciones,
} from './vocabulario-integraciones'
import { estadoDerivadoDeWebhook } from './vocabulario-centro-problemas'

function endpoint(parcial: Partial<WebhookEndpointDto>): WebhookEndpointDto {
  return {
    id: 'w1',
    nombre: 'maintenance-api',
    url: 'https://ops.example.com/orbi/webhooks',
    activo: true,
    eventos: [],
    scopes: [],
    firmaHmacActiva: true,
    secretoHuella: 'whsec_abc',
    ultimoEnvioUtc: null,
    ultimoEstado: null,
    ...parcial,
  }
}

function paginacion(parcial: Partial<PaginationMetadata>): PaginationMetadata {
  return {
    page: 1,
    pageSize: 20,
    itemCount: 3,
    totalItems: 3,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    fromItem: 1,
    toItem: 3,
    ...parcial,
  }
}

describe('el filtro de webhooks usa el vocabulario del BADGE, no uno propio', () => {
  it('ofrece los 6 codigos derivados', () => {
    expect(VALORES_FILTRO_ESTADO_WEBHOOK).toHaveLength(6)

    for (const valor of VALORES_FILTRO_ESTADO_WEBHOOK) {
      // Cada valor del filtro tiene que ser producible por la tabla de derivacion: si no, es una
      // opcion que nunca matchea.
      const producibles = [
        estadoDerivadoDeWebhook(false, null),
        estadoDerivadoDeWebhook(true, null),
        estadoDerivadoDeWebhook(true, 'enviado'),
        estadoDerivadoDeWebhook(true, 'pendiente'),
        estadoDerivadoDeWebhook(true, 'reintentando'),
        estadoDerivadoDeWebhook(true, 'fallido'),
        estadoDerivadoDeWebhook(true, 'agotado'),
      ]
      expect(producibles, valor).toContain(valor)
    }
  })

  /**
   * REGRESION del "chip que se manda y no filtra". `eventos[]` viaja **vacio siempre** (PENDIENTE
   * #3), asi que un filtro por evento devolveria cero resultados en toda organizacion. Este flag se
   * enciende el dia que DA-IN-08 cierre y el alta acepte suscripciones.
   */
  it('NO hay filtro por evento mientras el alta no acepte suscripciones', () => {
    expect(FILTRO_POR_EVENTO_DISPONIBLE).toBe(false)
  })
})

describe('filtrarWebhooks', () => {
  const endpoints = [
    endpoint({ id: 'a', nombre: 'maintenance-api', activo: true, ultimoEstado: 'enviado' }),
    endpoint({
      id: 'b',
      nombre: 'support-desk',
      url: 'https://soporte.example.com/hook',
      activo: true,
      ultimoEstado: 'fallido',
    }),
    endpoint({ id: 'c', nombre: 'legacy-erp', activo: false, ultimoEstado: 'enviado' }),
  ]

  it('con los filtros iniciales muestra solo los activos', () => {
    const resultado = filtrarWebhooks(endpoints, FILTROS_DE_WEBHOOKS_INICIALES)
    expect(resultado.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('la busqueda matchea nombre y URL, sin distinguir mayusculas', () => {
    expect(
      filtrarWebhooks(endpoints, { ...FILTROS_DE_WEBHOOKS_INICIALES, busqueda: 'SOPORTE' }).map(
        (e) => e.id,
      ),
    ).toEqual(['b'])

    expect(
      filtrarWebhooks(endpoints, { ...FILTROS_DE_WEBHOOKS_INICIALES, busqueda: 'maintenance' }).map(
        (e) => e.id,
      ),
    ).toEqual(['a'])
  })

  /**
   * Sin esta regla, elegir "Pausado" con el toggle en su posicion inicial devuelve **siempre vacio**
   * y el usuario no tiene forma de saber cual de los 2 controles lo dejo sin resultados.
   */
  it('el ESTADO prevalece sobre "Solo activos"', () => {
    const soloPausados = filtrarWebhooks(endpoints, {
      busqueda: '',
      estado: 'inactivo',
      soloActivos: true,
    })

    expect(soloPausados.map((e) => e.id)).toEqual(['c'])
  })

  it('filtra por el estado DERIVADO, no por `ultimoEstado` crudo', () => {
    // `c` esta pausado y su ultima entrega fue exitosa: el derivado gana y da `inactivo`, no
    // `activo`. Mostrarlo bajo "Activo" mandaria a alguien a mirar un endpoint apagado adrede.
    const activos = filtrarWebhooks(endpoints, {
      busqueda: '',
      estado: 'activo',
      soloActivos: false,
    })

    expect(activos.map((e) => e.id)).toEqual(['a'])
  })

  it('hayFiltrosDeWebhooksActivos distingue el default de un filtro puesto', () => {
    expect(hayFiltrosDeWebhooksActivos(FILTROS_DE_WEBHOOKS_INICIALES)).toBe(false)
    expect(
      hayFiltrosDeWebhooksActivos({ ...FILTROS_DE_WEBHOOKS_INICIALES, busqueda: ' ' }),
    ).toBe(false)
    expect(
      hayFiltrosDeWebhooksActivos({ ...FILTROS_DE_WEBHOOKS_INICIALES, soloActivos: false }),
    ).toBe(true)
    expect(hayFiltrosDeWebhooksActivos({ ...FILTROS_DE_WEBHOOKS_INICIALES, estado: 'fallando' })).toBe(
      true,
    )
  })
})

describe('lo que el filtrado client-side puede afirmar', () => {
  it('con una sola pagina, la pagina ES la organizacion y no hay nada que aclarar', () => {
    expect(elFiltradoEsDeLaPagina(paginacion({ totalPages: 1 }))).toBe(false)
    expect(elFiltradoEsDeLaPagina(null)).toBe(false)
  })

  it('con mas de una pagina, el filtro responde solo sobre lo que llego', () => {
    expect(elFiltradoEsDeLaPagina(paginacion({ totalPages: 2, totalItems: 31 }))).toBe(true)
  })
})

describe('saludDeIntegraciones', () => {
  it('cuenta los activos y toma el total de la paginacion', () => {
    const salud = saludDeIntegraciones(
      [endpoint({ id: 'a', activo: true }), endpoint({ id: 'b', activo: false })],
      paginacion({ totalItems: 2 }),
    )

    expect(salud).toEqual({ activos: 1, total: 2, esDeLaPagina: false })
  })

  /**
   * Las otras 2 tarjetas NO tienen funcion y eso es el punto: "Entregas 24 h" y "Fallos abiertos"
   * son DA-IN-04 abierta (sin formula ni ventana) y el log paginado no permite contarlas sin que el
   * numero cambie al paginar. Van en `—` desde el componente.
   */
  it('no calcula entregas 24 h ni fallos abiertos', () => {
    const salud: Record<string, unknown> = { ...saludDeIntegraciones([], null) }

    expect(salud.entregas24h).toBeUndefined()
    expect(salud.fallosAbiertos).toBeUndefined()
  })
})

describe('entregas', () => {
  function entrega(parcial: Partial<WebhookEntregaDto>): WebhookEntregaDto {
    return {
      id: 'e1',
      webhookEndpointId: 'a',
      eventId: 'evt-1',
      eventType: 'webhook.test',
      estado: 'enviado',
      intentos: 1,
      httpStatus: 200,
      errorResumen: null,
      ultimoIntentoUtc: '2026-08-15T10:00:00Z',
      proximoIntentoUtc: null,
      ...parcial,
    }
  }

  const endpoints = [endpoint({ id: 'a', nombre: 'maintenance-api' })]

  it('resuelve el nombre del endpoint cuando esta en la pagina cargada', () => {
    expect(nombreDelEndpointDeLaEntrega('a', endpoints)).toBe('maintenance-api')
  })

  /**
   * Pasa de verdad: el log es de TODA la organizacion y la lista de endpoints esta paginada; ademas
   * un endpoint dado de baja sale del listado y sus entregas quedan. La UI no debe pintar el uuid.
   */
  it('devuelve null cuando el endpoint no esta cargado (o fue dado de baja)', () => {
    expect(nombreDelEndpointDeLaEntrega('z', endpoints)).toBeNull()
  })

  it('filtra por endpoint sobre lo ya cargado y devuelve todo sin filtro', () => {
    const entregas = [entrega({ id: '1' }), entrega({ id: '2', webhookEndpointId: 'b' })]

    expect(filtrarEntregasPorEndpoint(entregas, 'a').map((e) => e.id)).toEqual(['1'])
    expect(filtrarEntregasPorEndpoint(entregas, null)).toHaveLength(2)
  })
})

describe('la card de firma HMAC documenta el contrato, no lo inventa', () => {
  it('son los 4 headers de `api.md` §Firma de webhooks', () => {
    expect(HEADERS_DE_FIRMA.map((header) => header.nombre)).toEqual([
      'X-Orbi-Signature',
      'X-Orbi-Event-Id',
      'X-Orbi-Event-Type',
      'X-Orbi-Timestamp',
    ])
  })

  /**
   * El string se compara **literal**: es lo que el receptor tiene que reproducir para validar. Un
   * espacio de mas, `v1:` en vez de `v1=`, o reserializar el body en vez de firmar el `rawBody`
   * hacen que TODA entrega se rechace del otro lado.
   */
  it('el string canonico es textual, con el prefijo `v1=` y el `rawBody`', () => {
    expect(STRING_CANONICO_DE_FIRMA).toBe('v1=<hex-hmac-sha256(timestamp + "." + rawBody)>')
  })

  /** DA-IN-08-b: es el UNICO hueco del esquema. Se muestra ausente, nunca un numero plausible. */
  it('la tolerancia del timestamp sigue sin definir', () => {
    expect(TOLERANCIA_DE_TIMESTAMP_DEFINIDA).toBe(false)
  })
})
