import { describe, expect, it } from 'vitest'
import type { CondicionReglaJsonDto, ReglaProblemaDto } from '@/services/contracts/flota'
import { validarCondicionEnCliente } from '../vocabulario-reglas-problemas'
import {
  aActualizarReglaRequest,
  aCondicionJson,
  aCrearReglaRequest,
  aFormularioDeRegla,
  aItemDeCondicion,
  intentaDesvincularWebhook,
  VALORES_INICIALES_REGLA,
  type FilaCondicionFormulario,
  type ReglaProblemaFormulario,
} from './regla-problema'

/**
 * El formulario guarda **strings** y el DSL guarda **tipos**. Toda la traduccion pasa por
 * `aItemDeCondicion`, y su invariante es que **nunca corrige**: un valor que no encaja viaja tal
 * cual y lo rechaza el validador con el mismo motivo que devolveria el backend.
 *
 * Estos tests anclan las 2 cosas que rompen en silencio si alguien "mejora" la conversion:
 *  1. `umbral_minutos` viaja en **snake_case** (el resto del contrato es camelCase);
 *  2. un numero mal tipeado NO se convierte en `0`.
 */

function fila(parcial: Partial<FilaCondicionFormulario> = {}): FilaCondicionFormulario {
  return { campo: 'minutos_sin_senal', operador: '>=', valor: '5', umbralMinutos: '', ...parcial }
}

describe('aItemDeCondicion traduce el formulario al DSL', () => {
  it('un campo numerico produce un number', () => {
    expect(aItemDeCondicion(fila())).toEqual({
      campo: 'minutos_sin_senal',
      operador: '>=',
      valor: 5,
    })
  })

  it('un campo booleano produce un boolean, no el string "true"', () => {
    const item = aItemDeCondicion(fila({ campo: 'ignicion', operador: '==', valor: 'true' }))
    expect(item.valor).toBe(true)
  })

  it('un campo de texto produce el string trimeado', () => {
    const item = aItemDeCondicion(fila({ campo: 'dtc_criticidad', operador: '==', valor: ' alta ' }))
    expect(item.valor).toBe('alta')
  })

  /**
   * ⚠️ La clave viaja en snake_case porque el backend le pone `[JsonPropertyName("umbral_minutos")]`.
   * Camelizarla la deja en `null` del otro lado y la regla se rechaza con
   * `umbral_minutos_invalido`, **sin ninguna pista de que el nombre estaba mal**.
   */
  it('`sostenido_por` incluye `umbral_minutos` en snake_case', () => {
    const item = aItemDeCondicion(
      fila({ campo: 'velocidad_kmh', operador: 'sostenido_por', valor: '110', umbralMinutos: '5' }),
    )

    expect(item).toEqual({
      campo: 'velocidad_kmh',
      operador: 'sostenido_por',
      valor: 110,
      umbral_minutos: 5,
    })
    expect(Object.keys(item)).not.toContain('umbralMinutos')
  })

  /**
   * El editor esconde el control de umbral al cambiar de operador. Si igual quedara un valor
   * colgado en el estado del formulario, mandarlo produciria un 400 por la causa 7 sobre una
   * condicion que el usuario ve bien.
   */
  it('un operador que no es `sostenido_por` nunca arrastra el umbral', () => {
    const item = aItemDeCondicion(fila({ umbralMinutos: '7' }))
    expect(item.umbral_minutos).toBeUndefined()
  })

  it('`in` parte por coma, trimea y descarta vacios — pero NO deduplica en silencio', () => {
    const item = aItemDeCondicion(
      fila({ campo: 'dtc_codigo', operador: 'in', valor: 'P0300, , P0420 , P0300' }),
    )

    expect(item.valor).toEqual(['P0300', 'P0420', 'P0300'])
    // Deduplicar guardaria una lista distinta de la que el usuario escribio: el mensaje correcto es
    // "sin repetidos", no una correccion muda.
    expect(validarCondicionEnCliente(aCondicionJson([
      fila({ campo: 'dtc_codigo', operador: 'in', valor: 'P0300, P0300' }),
    ])).motivo).toBe('lista_in_invalida')
  })

  it('un numero mal tipeado NO se convierte en 0: sale como string y el validador lo rechaza', () => {
    const item = aItemDeCondicion(fila({ valor: 'cinco' }))
    expect(item.valor).toBe('cinco')

    expect(validarCondicionEnCliente(aCondicionJson([fila({ valor: 'cinco' })])).motivo).toBe(
      'tipo_de_valor_incompatible',
    )
  })

  it('un campo numerico vacio tampoco se convierte en 0', () => {
    expect(aItemDeCondicion(fila({ valor: '' })).valor).toBe('')
  })
})

describe('aCondicionJson arma el shape v1', () => {
  it('siempre con version 1 y combinador "and" (sin OR, sin arboles)', () => {
    const json = aCondicionJson([fila()])
    expect(json.version).toBe(1)
    expect(json.combinador).toBe('and')
  })

  it('lo que produce el formulario inicial no valida todavia: el valor va vacio a proposito', () => {
    const json = aCondicionJson(VALORES_INICIALES_REGLA.condiciones)
    expect(validarCondicionEnCliente(json).motivo).toBe('tipo_de_valor_incompatible')
  })
})

describe('mapeo a los requests', () => {
  const valores: ReglaProblemaFormulario = {
    nombre: '  GPS sin senal  ',
    tipo: 'dispositivo',
    severidadBase: 'critica',
    slaMinutos: 15,
    accionSugerida: '  Verificar el equipo  ',
    webhookEndpointId: '',
    activa: true,
    condiciones: [fila()],
  }

  it('el alta trimea y omite el webhook cuando es "Sin webhook"', () => {
    const request = aCrearReglaRequest(valores)

    expect(request.nombre).toBe('GPS sin senal')
    expect(request.accionSugerida).toBe('Verificar el equipo')
    expect(request.webhookEndpointId).toBeUndefined()
  })

  it('el alta manda el webhook elegido', () => {
    expect(aCrearReglaRequest({ ...valores, webhookEndpointId: 'w1' }).webhookEndpointId).toBe('w1')
  })

  /**
   * ⚠️ El alcance NO se manda y el request ni lo declara (PENDIENTE #2). Mandar arrays vacios "por
   * las dudas" es el filtro que no filtra que D-S3-33 corrigio: el server los descartaria y el
   * usuario creeria haber acotado la regla.
   */
  it('el alta no manda alcance, destinatarios ni canales internos', () => {
    const request: Record<string, unknown> = { ...aCrearReglaRequest(valores) }

    for (const campo of [
      'vehiculosIds',
      'conductoresIds',
      'geozonasIds',
      'destinatarios',
      'canalesInternos',
    ]) {
      expect(request[campo], campo).toBeUndefined()
    }
  })

  /** `tipo` se fija en el alta (DA-PR-08): el `PATCH` no lo declara y mandarlo seria un no-op. */
  it('la edicion no manda `tipo`', () => {
    const request: Record<string, unknown> = { ...aActualizarReglaRequest(valores) }
    expect(request.tipo).toBeUndefined()
  })

  /**
   * ⚠️ B-18: `webhookEndpointId: null` **no desvincula** (el service preserva con `??`). Mandarlo
   * produciria un 200 que no hizo lo que el usuario pidio. Se omite, y el aviso lo da
   * `intentaDesvincularWebhook` ANTES de guardar.
   */
  it('la edicion OMITE el webhook en vez de mandarlo en null cuando se elige "Sin webhook"', () => {
    const request = aActualizarReglaRequest(valores)
    expect(request.webhookEndpointId).toBeUndefined()
    expect('webhookEndpointId' in request && request.webhookEndpointId === null).toBe(false)
  })
})

describe('intentaDesvincularWebhook', () => {
  function reglaCon(webhookEndpointId: string | null): ReglaProblemaDto {
    const condicion: CondicionReglaJsonDto = {
      version: 1,
      combinador: 'and',
      condiciones: [{ campo: 'ignicion', operador: '==', valor: true }],
    }

    return {
      id: 'r1',
      nombre: 'Regla',
      tipo: 'telemetria',
      condicion: '',
      condicionJson: condicion,
      severidadBase: 'media',
      activa: true,
      ventanaHoraria: null,
      vehiculosAlcanzadosCount: 0,
      geozonasAlcanzadasCount: 0,
      conductoresAlcanzadosCount: 0,
      destinatarios: [],
      canalesInternos: [],
      slaMinutos: 480,
      accionSugerida: 'Revisar',
      webhookEndpointId,
      ventanaSilencioMinutos: null,
      ultimasActivacionesCount: 0,
      ultimaActivacionUtc: null,
    }
  }

  const base: ReglaProblemaFormulario = { ...VALORES_INICIALES_REGLA, webhookEndpointId: '' }

  it('no avisa en un alta', () => {
    expect(intentaDesvincularWebhook(base, null)).toBe(false)
  })

  it('no avisa si la regla no tenia webhook', () => {
    expect(intentaDesvincularWebhook(base, reglaCon(null))).toBe(false)
  })

  it('no avisa si se cambia un webhook por otro', () => {
    expect(intentaDesvincularWebhook({ ...base, webhookEndpointId: 'w2' }, reglaCon('w1'))).toBe(
      false,
    )
  })

  it('avisa cuando la regla tenia webhook y se elige "Sin webhook"', () => {
    expect(intentaDesvincularWebhook(base, reglaCon('w1'))).toBe(true)
  })
})

describe('aFormularioDeRegla precarga desde `condicionJson`, no desde el string legible', () => {
  const regla: ReglaProblemaDto = {
    id: 'r1',
    nombre: 'Exceso sostenido',
    tipo: 'telemetria',
    // El string legible lo arma el server al leer y NO es parseable de vuelta.
    condicion: 'velocidad sostenida > 110 km/h por 5 min',
    condicionJson: {
      version: 1,
      combinador: 'and',
      condiciones: [
        { campo: 'velocidad_kmh', operador: 'sostenido_por', valor: 110, umbral_minutos: 5 },
        { campo: 'dtc_codigo', operador: 'in', valor: ['P0300', 'P0420'] },
      ],
    },
    severidadBase: 'alta',
    activa: false,
    ventanaHoraria: null,
    vehiculosAlcanzadosCount: 0,
    geozonasAlcanzadasCount: 0,
    conductoresAlcanzadosCount: 0,
    destinatarios: [],
    canalesInternos: [],
    slaMinutos: 60,
    accionSugerida: 'Contactar al conductor',
    webhookEndpointId: 'w1',
    ventanaSilencioMinutos: null,
    ultimasActivacionesCount: 0,
    ultimaActivacionUtc: null,
  }

  it('reconstruye las filas del editor con sus valores como texto', () => {
    const formulario = aFormularioDeRegla(regla)

    expect(formulario.condiciones).toEqual([
      { campo: 'velocidad_kmh', operador: 'sostenido_por', valor: '110', umbralMinutos: '5' },
      { campo: 'dtc_codigo', operador: 'in', valor: 'P0300, P0420', umbralMinutos: '' },
    ])
  })

  it('el ida y vuelta formulario -> DSL conserva la condicion', () => {
    expect(aCondicionJson(aFormularioDeRegla(regla).condiciones)).toEqual(regla.condicionJson)
  })

  it('conserva el webhook y el estado de pausa', () => {
    const formulario = aFormularioDeRegla(regla)
    expect(formulario.webhookEndpointId).toBe('w1')
    expect(formulario.activa).toBe(false)
  })
})
