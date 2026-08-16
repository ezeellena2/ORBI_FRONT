import { describe, expect, it } from 'vitest'
import es from '@/shared/i18n/locales/es-AR/flota.json'
import en from '@/shared/i18n/locales/en/flota.json'
import type {
  CondicionReglaJsonDto,
  PaginationMetadata,
  ReglaProblemaDto,
} from '@/services/contracts/flota'
import {
  CAMPOS_DSL,
  LIMITES_CONDICION,
  OPCIONES_DE_PLAZO_MINUTOS,
  OPERADORES_DSL,
  SLA_MINUTOS_POR_SEVERIDAD,
  accionesDeRegla,
  campoDsl,
  formatoDePlazo,
  nombreDeLaCopia,
  operadoresAdmitidos,
  resumenDeReglas,
  validarCondicionEnCliente,
} from './vocabulario-reglas-problemas'

/**
 * El vocabulario de REGLAS es el unico lugar del frontend que **duplica una regla del backend a
 * proposito**: la gramatica del DSL. Estos tests existen para que esa duplicacion no derive.
 *
 * Los casos de `validarCondicionEnCliente` estan escritos contra
 * `Flota.Domain/Reglas/ValidadorCondicion.cs`, causa por causa y **en su orden**, porque el orden es
 * lo que decide QUE mensaje ve el usuario cuando una condicion incumple dos cosas a la vez.
 */

function condicion(parcial: Partial<CondicionReglaJsonDto> = {}): CondicionReglaJsonDto {
  return {
    version: 1,
    combinador: 'and',
    condiciones: [{ campo: 'minutos_sin_senal', operador: '>=', valor: 5 }],
    ...parcial,
  }
}

describe('la gramatica del DSL es el espejo exacto de `GramaticaDsl.cs`', () => {
  it('tiene los 13 campos del enum v1 y ninguno de geozona (DIFERIDO DA-08)', () => {
    expect(CAMPOS_DSL).toHaveLength(13)

    const codigos = CAMPOS_DSL.map((campo) => campo.codigo)
    expect(codigos).not.toContain('geozona_entrada')
    expect(codigos).not.toContain('geozona_salida')
    expect(codigos).not.toContain('minutos_en_geozona')
  })

  it('tiene los 7 operadores del enum §2.3', () => {
    expect(OPERADORES_DSL).toHaveLength(7)
    expect(OPERADORES_DSL).toContain('sostenido_por')
  })

  it('cada campo declara solo operadores que existen en el enum', () => {
    for (const campo of CAMPOS_DSL) {
      expect(campo.operadores.length, `${campo.codigo} sin operadores`).toBeGreaterThan(0)
      for (const operador of campo.operadores) {
        expect(OPERADORES_DSL, `${campo.codigo} -> ${operador}`).toContain(operador)
      }
    }
  })

  it('`in` solo lo admiten los 2 campos de texto (§2.3: pertenencia sobre string[])', () => {
    const conIn = CAMPOS_DSL.filter((campo) => campo.operadores.includes('in')).map((c) => c.codigo)
    expect(conIn).toEqual(['dtc_criticidad', 'dtc_codigo'])
  })

  it('`sostenido_por` solo lo admiten los 3 campos con serie temporal', () => {
    const conSostenido = CAMPOS_DSL.filter((campo) =>
      campo.operadores.includes('sostenido_por'),
    ).map((c) => c.codigo)

    expect(conSostenido).toEqual(['velocidad_kmh', 'ignicion', 'en_movimiento'])
  })

  it('un campo fuera del enum no devuelve definicion ni operadores', () => {
    expect(campoDsl('temperatura_motor')).toBeNull()
    expect(operadoresAdmitidos('temperatura_motor')).toEqual([])
  })
})

describe('validarCondicionEnCliente reproduce las 9 causas del dominio', () => {
  it('acepta una condicion valida', () => {
    expect(validarCondicionEnCliente(condicion()).valida).toBe(true)
  })

  it('causa 0 — sin condicion es `json_no_parseable`', () => {
    expect(validarCondicionEnCliente(null).motivo).toBe('json_no_parseable')
  })

  it('causa 1 — `version` distinta de 1', () => {
    const veredicto = validarCondicionEnCliente(condicion({ version: 2 }))
    expect(veredicto.motivo).toBe('version_no_soportada')
    // Las 3 causas que no son de una condicion viajan SIN indice: un `0` apuntaria a una inocente.
    expect(veredicto.indice).toBeNull()
  })

  it('causa 2 — `combinador` distinto de "and" (no hay OR en v1)', () => {
    const veredicto = validarCondicionEnCliente(condicion({ combinador: 'or' }))
    expect(veredicto.motivo).toBe('combinador_no_soportado')
    expect(veredicto.indice).toBeNull()
  })

  it('causa 3 — cero condiciones, o mas del maximo', () => {
    expect(validarCondicionEnCliente(condicion({ condiciones: [] })).motivo).toBe(
      'cantidad_de_condiciones_invalida',
    )

    const demasiadas = Array.from({ length: LIMITES_CONDICION.maximoCondiciones + 1 }, () => ({
      campo: 'ignicion' as const,
      operador: '==' as const,
      valor: true,
    }))
    expect(validarCondicionEnCliente(condicion({ condiciones: demasiadas })).motivo).toBe(
      'cantidad_de_condiciones_invalida',
    )
  })

  it('causa 4 — campo fuera del enum, con el indice de la fila ofensora', () => {
    const veredicto = validarCondicionEnCliente(
      condicion({
        condiciones: [
          { campo: 'ignicion', operador: '==', valor: true },
          // @ts-expect-error: el punto del test es un campo que el tipo NO admite.
          { campo: 'temperatura_motor', operador: '>', valor: 90 },
        ],
      }),
    )

    expect(veredicto.motivo).toBe('campo_desconocido')
    expect(veredicto.indice).toBe(1)
  })

  it('causa 5 — operador conocido pero no admitido para ese campo', () => {
    // `>` existe en el enum, y `ignicion` (booleano) no lo admite.
    const veredicto = validarCondicionEnCliente(
      condicion({ condiciones: [{ campo: 'ignicion', operador: '>', valor: 1 }] }),
    )

    expect(veredicto.motivo).toBe('operador_no_admitido')
    expect(veredicto.indice).toBe(0)
  })

  it('causa 6 — tipo de valor incompatible con el par campo+operador', () => {
    const veredicto = validarCondicionEnCliente(
      condicion({ condiciones: [{ campo: 'minutos_sin_senal', operador: '>=', valor: 'cinco' }] }),
    )

    expect(veredicto.motivo).toBe('tipo_de_valor_incompatible')
  })

  it('causa 7 — `sostenido_por` sin umbral, y umbral sin `sostenido_por`', () => {
    const sinUmbral = validarCondicionEnCliente(
      condicion({ condiciones: [{ campo: 'velocidad_kmh', operador: 'sostenido_por', valor: 110 }] }),
    )
    expect(sinUmbral.motivo).toBe('umbral_minutos_invalido')

    const umbralDeMas = validarCondicionEnCliente(
      condicion({
        condiciones: [
          { campo: 'minutos_sin_senal', operador: '>=', valor: 5, umbral_minutos: 3 },
        ],
      }),
    )
    expect(umbralDeMas.motivo).toBe('umbral_minutos_invalido')
  })

  /**
   * EL ORDEN ES CONTRATO. Una condicion con `sostenido_por`, sin umbral **y** con el valor de tipo
   * equivocado incumple la causa 6 y la 7 a la vez. El dominio evalua el umbral ANTES, asi que el
   * usuario tiene que leer "faltan los minutos sostenidos" — si el cliente dijera lo otro, el
   * mensaje cambiaria al llegar al server y pareceria que el backend contradice a la pantalla.
   */
  it('el umbral se evalua ANTES que el tipo de valor, igual que el dominio', () => {
    const veredicto = validarCondicionEnCliente(
      condicion({
        condiciones: [{ campo: 'velocidad_kmh', operador: 'sostenido_por', valor: 'rapido' }],
      }),
    )

    expect(veredicto.motivo).toBe('umbral_minutos_invalido')
  })

  it('causa 8 — lista `in` vacia, con duplicados o por encima del maximo', () => {
    const vacia = validarCondicionEnCliente(
      condicion({ condiciones: [{ campo: 'dtc_codigo', operador: 'in', valor: [] }] }),
    )
    expect(vacia.motivo).toBe('lista_in_invalida')

    const duplicada = validarCondicionEnCliente(
      condicion({
        condiciones: [{ campo: 'dtc_codigo', operador: 'in', valor: ['P0300', 'P0300'] }],
      }),
    )
    expect(duplicada.motivo).toBe('lista_in_invalida')

    const larga = Array.from(
      { length: LIMITES_CONDICION.maximoElementosIn + 1 },
      (_, indice) => `P${indice}`,
    )
    expect(
      validarCondicionEnCliente(
        condicion({ condiciones: [{ campo: 'dtc_codigo', operador: 'in', valor: larga }] }),
      ).motivo,
    ).toBe('lista_in_invalida')
  })

  it('`in` sobre un campo numerico se rechaza por operador, no por lista', () => {
    const veredicto = validarCondicionEnCliente(
      condicion({ condiciones: [{ campo: 'bateria_pct', operador: 'in', valor: ['10'] }] }),
    )

    expect(veredicto.motivo).toBe('operador_no_admitido')
  })

  it('devuelve el PRIMER incumplimiento: `args` es singular en el catalogo de errores', () => {
    const veredicto = validarCondicionEnCliente(
      condicion({
        condiciones: [
          // @ts-expect-error: campo invalido en la fila 0.
          { campo: 'inexistente', operador: '==', valor: true },
          { campo: 'dtc_codigo', operador: 'in', valor: [] },
        ],
      }),
    )

    expect(veredicto.indice).toBe(0)
    expect(veredicto.motivo).toBe('campo_desconocido')
  })
})

describe('el plazo se lee como lo pide la ficha', () => {
  it('los 4 defaults de §4.1 se leen 15 min / 1 h / 8 h / 48 h', () => {
    expect(formatoDePlazo(15)).toEqual({ clave: 'centro.reglas.plazo.minutos', cantidad: 15 })
    expect(formatoDePlazo(60)).toEqual({ clave: 'centro.reglas.plazo.horas', cantidad: 1 })
    expect(formatoDePlazo(480)).toEqual({ clave: 'centro.reglas.plazo.horas', cantidad: 8 })
    expect(formatoDePlazo(2880)).toEqual({ clave: 'centro.reglas.plazo.horas', cantidad: 48 })
  })

  it('un plazo que no es multiplo de 60 se muestra en minutos, sin partirlo en 2 unidades', () => {
    expect(formatoDePlazo(90)).toEqual({ clave: 'centro.reglas.plazo.minutos', cantidad: 90 })
  })

  it('las opciones del select son exactamente los 4 SLA default de las 4 severidades', () => {
    expect([...OPCIONES_DE_PLAZO_MINUTOS].sort((a, b) => a - b)).toEqual(
      Object.values(SLA_MINUTOS_POR_SEVERIDAD).sort((a, b) => a - b),
    )
  })
})

describe('el resumen operativo no afirma mas de lo que la pagina sabe', () => {
  function regla(parcial: Partial<ReglaProblemaDto>): ReglaProblemaDto {
    return {
      id: 'r1',
      nombre: 'Regla',
      tipo: 'telemetria',
      condicion: 'ignicion == true',
      condicionJson: condicion(),
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
      webhookEndpointId: null,
      ventanaSilencioMinutos: null,
      ultimasActivacionesCount: 0,
      ultimaActivacionUtc: null,
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

  const reglas = [
    regla({ id: 'a', activa: true, severidadBase: 'critica', webhookEndpointId: 'w1' }),
    regla({ id: 'b', activa: true, severidadBase: 'media' }),
    regla({ id: 'c', activa: false, severidadBase: 'critica', webhookEndpointId: 'w2' }),
  ]

  it('cuenta activas, criticas ACTIVAS y con webhook', () => {
    const resumen = resumenDeReglas(reglas, paginacion({}))

    expect(resumen.activas).toBe(2)
    // La critica pausada NO se cuenta: la ficha §3 define el contador sobre `activa=true`, y una
    // regla pausada no vigila nada.
    expect(resumen.criticas).toBe(1)
    expect(resumen.conWebhook).toBe(2)
    expect(resumen.total).toBe(3)
  })

  it('con UNA sola pagina los contadores son de la organizacion y no llevan aclaracion', () => {
    expect(resumenDeReglas(reglas, paginacion({ totalPages: 1 })).esDeLaPagina).toBe(false)
  })

  /**
   * Es la trampa de B-35, medida en vez de supuesta: con mas de una pagina el contador describe lo
   * que llego, no la organizacion, y cambia al paginar. Se sigue mostrando —un numero rotulado es
   * mejor que ningun numero— pero la UI tiene que decirlo.
   */
  it('con mas de una pagina se marca que los contadores son de la pagina', () => {
    expect(
      resumenDeReglas(reglas, paginacion({ totalPages: 3, totalItems: 47 })).esDeLaPagina,
    ).toBe(true)
  })

  it('sin metadata de paginacion cae al conteo local y no inventa un total', () => {
    const resumen = resumenDeReglas(reglas, null)
    expect(resumen.total).toBe(3)
    expect(resumen.esDeLaPagina).toBe(false)
  })
})

describe('acciones de fila', () => {
  function regla(parcial: Partial<ReglaProblemaDto>): ReglaProblemaDto {
    return {
      id: 'r1',
      nombre: 'Regla',
      tipo: 'telemetria',
      condicion: '',
      condicionJson: condicion(),
      severidadBase: 'media',
      activa: true,
      ventanaHoraria: null,
      vehiculosAlcanzadosCount: 0,
      geozonasAlcanzadasCount: 0,
      conductoresAlcanzadosCount: 0,
      destinatarios: [],
      canalesInternos: [],
      slaMinutos: 480,
      accionSugerida: '',
      webhookEndpointId: null,
      ventanaSilencioMinutos: null,
      ultimasActivacionesCount: 0,
      ultimaActivacionUtc: null,
      ...parcial,
    }
  }

  it('pausar y activar son mutuamente excluyentes', () => {
    expect(accionesDeRegla(regla({ activa: true }))).toContain('pausar')
    expect(accionesDeRegla(regla({ activa: true }))).not.toContain('activar')

    expect(accionesDeRegla(regla({ activa: false }))).toContain('activar')
    expect(accionesDeRegla(regla({ activa: false }))).not.toContain('pausar')
  })

  it('probar webhook solo aparece en reglas que tienen uno', () => {
    expect(accionesDeRegla(regla({ webhookEndpointId: null }))).not.toContain('probarWebhook')
    expect(accionesDeRegla(regla({ webhookEndpointId: 'w1' }))).toContain('probarWebhook')
  })

  it('ver conductores solo en reglas de tipo conductor', () => {
    expect(accionesDeRegla(regla({ tipo: 'conductor' }))).toContain('verConductores')
    expect(accionesDeRegla(regla({ tipo: 'telemetria' }))).not.toContain('verConductores')
  })

  /**
   * REGRESION. Las 4 que no estan tienen motivos distintos y ninguno es "todavia no lo hicimos":
   * eliminar no existe en el contrato (la baja ES pausar), geozonas esta DIFERIDO, y "ver
   * activaciones"/"probar regla" no tienen fila en `api.md`.
   */
  it('no ofrece eliminar, ver geozonas, ver activaciones ni probar regla', () => {
    const todas = new Set([
      ...accionesDeRegla(regla({ activa: true, webhookEndpointId: 'w1', tipo: 'conductor' })),
      ...accionesDeRegla(regla({ activa: false })),
    ])

    expect(todas.has('eliminar' as never)).toBe(false)
    expect(todas.has('verGeozonas' as never)).toBe(false)
    expect(todas.has('verActivaciones' as never)).toBe(false)
    expect(todas.has('probarRegla' as never)).toBe(false)
  })
})

describe('nombre de la copia al duplicar', () => {
  it('agrega el sufijo', () => {
    expect(nombreDeLaCopia('DTC critico', ' (copia)')).toBe('DTC critico (copia)')
  })

  /**
   * Sin esto, duplicar una regla con nombre al limite genera un 400 `validation.nombre.max_length`
   * que el usuario no pidio. Se recorta el NOMBRE y nunca el sufijo: sin sufijo, la copia y el
   * original son indistinguibles en la tabla.
   */
  it('recorta el nombre, no el sufijo, para no pasarse del maximo del backend', () => {
    const largo = 'x'.repeat(200)
    const resultado = nombreDeLaCopia(largo, ' (copia)')

    expect(resultado).toHaveLength(200)
    expect(resultado.endsWith(' (copia)')).toBe(true)
  })
})

describe('el copy del webhook de la regla NO promete un fan-out que no existe', () => {
  /**
   * REGRESIÓN de la mentira más cara que corrigió el cierre de slice-06.
   *
   * `MotorDeReglasService` tiene **0 apariciones de `webhook`**: la regla valida el endpoint y
   * guarda su id, y **nadie lo lee cuando dispara**. El único llamador de
   * `EntregaWebhookService.EntregarAhora` es `POST /integraciones/webhooks/{id}/probar`. O sea que
   * el copy que decía *"avisa a un sistema externo cada vez que esta regla abre un problema"*
   * describía un efecto que no ocurre — y encima la pantalla de Integraciones, dos clics más allá,
   * decía lo contrario (`centroBloqueado.suscripciones`).
   *
   * Se ancla el **hecho**, no la redacción: la ayuda del campo no puede prometer el aviso, y tiene
   * que nombrar la única vía que sí produce una entrega.
   */
  const PROMESAS_DE_FANOUT = [
    /cada vez que/i,
    /every time/i,
    /avisa a un sistema externo\./i,
    /notifies an external system\./i,
  ]

  function texto(diccionario: unknown, clave: string): string {
    const valor = clave
      .split('.')
      .reduce<unknown>(
        (nodo, tramo) =>
          typeof nodo === 'object' && nodo !== null
            ? (nodo as Record<string, unknown>)[tramo]
            : undefined,
        diccionario,
      )

    expect(typeof valor, `${clave} falta o no es texto`).toBe('string')
    return valor as string
  }

  it('la ayuda del campo Webhook no promete el envio automatico, en los 2 idiomas', () => {
    for (const [idioma, diccionario] of [
      ['es-AR', es],
      ['en', en],
    ] as const) {
      const ayuda = texto(diccionario, 'centro.reglas.modal.webhookAyuda')

      for (const promesa of PROMESAS_DE_FANOUT) {
        expect(promesa.test(ayuda), `${idioma} / ${String(promesa)}`).toBe(false)
      }
    }
  })

  it('el resumen no dice que las reglas con webhook avisan a nadie', () => {
    for (const diccionario of [es, en]) {
      const detalle = texto(diccionario, 'centro.reglas.resumen.conWebhookDetalle')

      expect(/avisan/i.test(detalle)).toBe(false)
      expect(/notify/i.test(detalle)).toBe(false)
    }
  })
})
