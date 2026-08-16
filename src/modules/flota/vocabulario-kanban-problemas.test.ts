import { describe, expect, it } from 'vitest'
import type { EstadoProblema, ProblemaOperativoListItemDto } from '@/services/contracts/flota'
import { ESTADOS_PROBLEMA } from './vocabulario-centro-problemas'
import {
  ARRASTRE_DE_CARDS_DISPONIBLE,
  COLUMNAS_DEL_TABLERO,
  COLUMNA_ESPERANDO_EXTERNO_DEFINIDA,
  MAXIMO_VISIBLE_RESUELTO_HOY,
  agruparEnColumnas,
  aplicarMovimientoOptimista,
  claveDeAyudaDeColumna,
  claveDeColumnaDelTablero,
  columnaAceptaDrop,
  columnaDeProblema,
  columnaSeRecorta,
  contarFueraDelTablero,
  esDelMismoDiaLocal,
  movimientoDeCard,
  revertirMovimiento,
  type ColumnaDelTablero,
  type MovimientoDeCard,
  type OverridesDelTablero,
} from './vocabulario-kanban-problemas'

/** Fábrica mínima: solo se completa lo que cada caso mira. */
function problema(
  parcial: Partial<ProblemaOperativoListItemDto> = {},
): ProblemaOperativoListItemDto {
  return {
    id: 'p-1',
    tipo: 'dtc_critico',
    estado: 'detectado',
    severidad: 'media',
    prioridad: 50,
    titulo: 'Un problema',
    vehiculo: null,
    conductor: null,
    origenes: ['telemetria'],
    senalesCount: 1,
    accionSugerida: 'Revisar',
    responsable: null,
    sla: { venceUtc: null, estado: 'sin_sla', minutosRestantes: null },
    integracion: { enviado: false, ultimoEstado: null },
    fechaDeteccionUtc: '2026-08-15T12:00:00Z',
    fechaActualizacionUtc: '2026-08-15T12:00:00Z',
    ...parcial,
  }
}

/**
 * "Ahora" fijo del día del CLIENTE. Se construye con el constructor local (no con una `Z`) a
 * propósito: la ventana de "hoy" es el día calendario del navegador (DA-PC-16), así que el test
 * tiene que hablar el mismo idioma que la función o pasaría/fallaría según el huso del CI.
 */
const AHORA = new Date(2026, 7, 15, 15, 0, 0).getTime()
const HOY = (hora: number) => new Date(2026, 7, 15, hora, 0, 0).toISOString()
const AYER = (hora: number) => new Date(2026, 7, 14, hora, 0, 0).toISOString()

describe('lo que el tablero declara que NO puede hacer', () => {
  /**
   * REGRESIÓN, y es la constante que decide la forma de la pantalla. `POST /problemas/{id}/estado`
   * no está enrutado: sin request no hay ventana en vuelo, así que el estado optimista sería
   * inobservable y "drag + rollback" degeneraría en "arrastro y no pasa nada". Por eso el drag va
   * deshabilitado con el motivo a la vista, y el ciclo de abajo queda probado para el día que el
   * endpoint exista.
   *
   * Si alguien enciende esto sin agregar `cambiarEstado` al service, el test se pone rojo.
   */
  it('el arrastre de cards NO esta disponible: el endpoint de transicion no esta enrutado', () => {
    expect(ARRASTRE_DE_CARDS_DISPONIBLE).toBe(false)
  })

  it('la columna "Esperando externo" no tiene definicion (DA-PC-03) y se dibuja inerte', () => {
    expect(COLUMNA_ESPERANDO_EXTERNO_DEFINIDA).toBe(false)
    expect(columnaAceptaDrop('esperando_externo')).toBe(false)
  })

  /**
   * Los terminales NO se alcanzan por drag libre: resolver exige `resultado` + `evidencia` y es
   * irreversible. Soltar ahí abre el modal, nunca persiste el cierre solo.
   */
  it('"Resuelto hoy" no es destino de drag; los 2 estados intermedios si', () => {
    expect(columnaAceptaDrop('resuelto_hoy')).toBe(false)
    expect(columnaAceptaDrop('detectado')).toBe(true)
    expect(columnaAceptaDrop('en_analisis')).toBe(true)
  })
})

describe('columnas del tablero', () => {
  it('son las 4 de la ficha, en orden de avance', () => {
    expect(COLUMNAS_DEL_TABLERO).toEqual([
      'detectado',
      'en_analisis',
      'esperando_externo',
      'resuelto_hoy',
    ])
  })

  it('los 3 estados de apertura caen en Detectado', () => {
    for (const estado of ['detectado', 'priorizado', 'asignado'] as const) {
      expect(columnaDeProblema(problema({ estado }), AHORA)).toBe('detectado')
    }
  })

  it('en_analisis tiene columna propia', () => {
    expect(columnaDeProblema(problema({ estado: 'en_analisis' }), AHORA)).toBe('en_analisis')
  })

  /**
   * ⚠️ Es un HUECO DE LA FICHA, no del código: 7 estados y 4 columnas que cubren 6. Un silenciado
   * sigue **abierto** y su plazo corre, así que desaparecer del tablero sin rastro sería la misma
   * clase de mentira que un vehículo que no aparece en el mapa (D-S5M-2). Se cuenta y se declara.
   */
  it('SILENCIADO no cae en ninguna columna, y por eso se cuenta aparte', () => {
    expect(columnaDeProblema(problema({ estado: 'silenciado' }), AHORA)).toBeNull()
  })

  it('ningun estado del catalogo queda sin decision explicita', () => {
    // Barrido sobre los 7: si el contrato agrega un estado, el `Record` no compila y este caso
    // recuerda que hay que decidir su columna en vez de dejarlo caer en `undefined`.
    for (const estado of ESTADOS_PROBLEMA satisfies readonly EstadoProblema[]) {
      const columna = columnaDeProblema(problema({ estado, fechaActualizacionUtc: HOY(9) }), AHORA)
      expect(columna === null || COLUMNAS_DEL_TABLERO.includes(columna)).toBe(true)
    }
  })
})

describe('la ventana de "hoy" es el dia calendario del cliente (DA-PC-16)', () => {
  it('un cierre de hoy entra en Resuelto hoy', () => {
    for (const estado of ['resuelto', 'descartado'] as const) {
      expect(
        columnaDeProblema(problema({ estado, fechaActualizacionUtc: HOY(9) }), AHORA),
      ).toBe('resuelto_hoy')
    }
  })

  /**
   * Un terminal de ayer NO entra: la columna dice "hoy" y meterlo ahí sería falso. Tampoco
   * desaparece en silencio — lo cuenta `contarFueraDelTablero`.
   */
  it('un cierre de ayer NO entra, y no desaparece: se cuenta', () => {
    const viejo = problema({ estado: 'resuelto', fechaActualizacionUtc: AYER(23) })

    expect(columnaDeProblema(viejo, AHORA)).toBeNull()
    expect(contarFueraDelTablero([viejo], AHORA)).toEqual({
      silenciados: 0,
      cerradosDeOtroDia: 1,
      total: 1,
    })
  })

  it('una fecha que no parsea NO cuenta como hoy', () => {
    // Un `NaN` que se colara como "hoy" pondría en la columna de cierres de hoy un caso del que no
    // sabemos cuándo se cerró.
    expect(esDelMismoDiaLocal('no-es-una-fecha', AHORA)).toBe(false)
  })

  it('mismo dia pero otra hora sigue siendo hoy; el dia anterior no', () => {
    expect(esDelMismoDiaLocal(HOY(0), AHORA)).toBe(true)
    expect(esDelMismoDiaLocal(HOY(23), AHORA)).toBe(true)
    expect(esDelMismoDiaLocal(AYER(23), AHORA)).toBe(false)
  })
})

describe('agrupamiento de la pagina en columnas', () => {
  it('reparte cada problema en su columna y conserva el orden del servidor', () => {
    const items = [
      problema({ id: 'a', estado: 'detectado' }),
      problema({ id: 'b', estado: 'en_analisis' }),
      problema({ id: 'c', estado: 'priorizado' }),
      problema({ id: 'd', estado: 'resuelto', fechaActualizacionUtc: HOY(10) }),
    ]

    const grupos = agruparEnColumnas(items, AHORA)

    expect(grupos.detectado.map((p) => p.id)).toEqual(['a', 'c'])
    expect(grupos.en_analisis.map((p) => p.id)).toEqual(['b'])
    expect(grupos.resuelto_hoy.map((p) => p.id)).toEqual(['d'])
  })

  it('"Esperando externo" queda SIEMPRE vacia: ningun estado la alimenta', () => {
    const items = ESTADOS_PROBLEMA.map((estado, indice) =>
      problema({ id: `p-${indice}`, estado, fechaActualizacionUtc: HOY(9) }),
    )

    expect(agruparEnColumnas(items, AHORA).esperando_externo).toEqual([])
  })

  it('las cards fuera del tablero se cuentan por causa, y las 2 causas no se mezclan', () => {
    const items = [
      problema({ id: 'a', estado: 'silenciado' }),
      problema({ id: 'b', estado: 'silenciado' }),
      problema({ id: 'c', estado: 'descartado', fechaActualizacionUtc: AYER(8) }),
      problema({ id: 'd', estado: 'detectado' }),
    ]

    expect(contarFueraDelTablero(items, AHORA)).toEqual({
      silenciados: 2,
      cerradosDeOtroDia: 1,
      total: 3,
    })
  })

  it('el override optimista gana sobre la columna natural', () => {
    const items = [problema({ id: 'a', estado: 'detectado' })]

    const grupos = agruparEnColumnas(items, AHORA, { a: 'en_analisis' })

    expect(grupos.detectado).toEqual([])
    expect(grupos.en_analisis.map((p) => p.id)).toEqual(['a'])
  })

  it('solo "Resuelto hoy" se recorta con "ver N mas"', () => {
    expect(MAXIMO_VISIBLE_RESUELTO_HOY).toBe(3)
    expect(columnaSeRecorta('resuelto_hoy')).toBe(true)
    for (const columna of ['detectado', 'en_analisis', 'esperando_externo'] as const) {
      expect(columnaSeRecorta(columna)).toBe(false)
    }
  })
})

describe('claves i18n de las columnas', () => {
  it('se arman por concatenacion sobre los 4 codigos', () => {
    for (const columna of COLUMNAS_DEL_TABLERO) {
      expect(claveDeColumnaDelTablero(columna)).toBe(`centro.kanban.columna.${columna}`)
      expect(claveDeAyudaDeColumna(columna)).toBe(`centro.kanban.columnaAyuda.${columna}`)
    }
  })
})

/* ══ El ciclo optimista → ROLLBACK (criterio C-8, `f-08` paso 7) ═══════════════════════════════ */

describe('movimiento optimista y rollback', () => {
  it('aplicar mueve la card a la columna destino', () => {
    const movimiento = movimientoDeCard({}, 'a', 'detectado', 'en_analisis')

    expect(aplicarMovimientoOptimista({}, movimiento)).toEqual({ a: 'en_analisis' })
  })

  /**
   * El caso que hace que "exactamente" sea literal: sin override previo, revertir tiene que
   * **borrar** la clave. Escribir `desde` dejaría una entrada que antes no existía — se vería igual
   * en pantalla y el estado no sería el mismo, así que una secuencia larga acumularía basura.
   */
  it('revertir BORRA la clave cuando la card estaba en su columna natural', () => {
    const movimiento = movimientoDeCard({}, 'a', 'detectado', 'en_analisis')
    const conOptimista = aplicarMovimientoOptimista({}, movimiento)

    expect(revertirMovimiento(conOptimista, movimiento)).toEqual({})
    expect(Object.hasOwn(revertirMovimiento(conOptimista, movimiento), 'a')).toBe(false)
  })

  it('revertir RESTAURA el override previo cuando lo habia', () => {
    const inicial: OverridesDelTablero = { a: 'en_analisis' }
    const movimiento = movimientoDeCard(inicial, 'a', 'en_analisis', 'detectado')

    const conOptimista = aplicarMovimientoOptimista(inicial, movimiento)
    expect(conOptimista).toEqual({ a: 'detectado' })
    expect(revertirMovimiento(conOptimista, movimiento)).toEqual({ a: 'en_analisis' })
  })

  it('ninguna de las 2 funciones muta el estado que recibe', () => {
    const inicial: OverridesDelTablero = { a: 'en_analisis' }
    const movimiento = movimientoDeCard(inicial, 'a', 'en_analisis', 'detectado')

    aplicarMovimientoOptimista(inicial, movimiento)
    revertirMovimiento(inicial, movimiento)

    expect(inicial).toEqual({ a: 'en_analisis' })
  })

  /**
   * PROPERTY TEST (`f-08` paso 7): 20 secuencias de drags aplicadas y revertidas en orden LIFO
   * devuelven el tablero **exactamente** al estado previo.
   *
   * Es el invariante que el criterio C-8 pide y el que tiene que ser correcto el día que el
   * endpoint exista: una card no puede quedar mostrando un estado que no se persistió, ni siquiera
   * después de 8 drags encadenados sobre las mismas 4 cards.
   *
   * El generador es determinista (LCG con semilla fija): un property test que falla una vez cada
   * cien corridas y no se puede reproducir es peor que no tenerlo.
   */
  it('20 secuencias de drags: aplicar y revertir devuelve el tablero al estado exacto', () => {
    const CARDS = ['a', 'b', 'c', 'd']
    const DESTINOS: readonly ColumnaDelTablero[] = ['detectado', 'en_analisis']

    let semilla = 20260815
    const siguiente = (tope: number) => {
      semilla = (semilla * 1103515245 + 12345) % 2147483648
      return semilla % tope
    }

    for (let secuencia = 0; secuencia < 20; secuencia += 1) {
      const inicial: OverridesDelTablero =
        secuencia % 2 === 0 ? {} : { a: 'en_analisis', c: 'detectado' }

      let estado = inicial
      const pila: MovimientoDeCard[] = []

      const largo = 1 + siguiente(8)
      for (let paso = 0; paso < largo; paso += 1) {
        const card = CARDS[siguiente(CARDS.length)]
        const hacia = DESTINOS[siguiente(DESTINOS.length)]
        const desde = estado[card] ?? 'detectado'

        const movimiento = movimientoDeCard(estado, card, desde, hacia)
        pila.push(movimiento)
        estado = aplicarMovimientoOptimista(estado, movimiento)
      }

      // Rollback en orden inverso: es el orden real (el último drag es el primero en fallar).
      for (const movimiento of [...pila].reverse()) {
        estado = revertirMovimiento(estado, movimiento)
      }

      expect(estado, `secuencia ${secuencia} no volvio al estado inicial`).toEqual(inicial)
      expect(Object.keys(estado).sort()).toEqual(Object.keys(inicial).sort())
    }
  })
})
