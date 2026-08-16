import { describe, expect, it } from 'vitest'
import type {
  ProblemaOperativoDetalleDto,
  ProblemaPrioridadDto,
} from '@/services/contracts/flota'
import { FACTORES_PRIORIDAD } from './vocabulario-centro-problemas'
import {
  ACCIONES_DE_INCIDENTE_DISPONIBLES,
  COMENTARIOS_DISPONIBLES,
  CONTACTAR_CONDUCTOR_DISPONIBLE,
  CONTEXTO_DE_REGLA_DISPONIBLE,
  CORRELACION_PROBLEMA_WEBHOOK_DISPONIBLE,
  TABS_DEL_TICKET,
  claveDeTabDelTicket,
  contarTimeline,
  desfasajeDePrioridad,
  hayDesfasajeDePrioridad,
  sumaDeFactores,
  tabLlevaContador,
  tieneAccionesDeMutacion,
} from './vocabulario-ticket-problema'

function prioridad(parcial: Partial<ProblemaPrioridadDto> = {}): ProblemaPrioridadDto {
  return {
    prioridad: 60,
    severidadBase: 'alta',
    factores: FACTORES_PRIORIDAD.map((codigo) => ({
      codigo,
      etiqueta: '',
      puntos: 0,
      explicacion: '',
    })),
    ...parcial,
  }
}

function detalle(
  parcial: Partial<ProblemaOperativoDetalleDto> = {},
): ProblemaOperativoDetalleDto {
  return {
    id: 'p-1',
    tipo: 'dtc_critico',
    estado: 'detectado',
    severidad: 'alta',
    prioridad: 60,
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
    descripcion: 'Qué pasó',
    prioridadDetalle: prioridad(),
    senales: [],
    contextoOperativo: null,
    timeline: [],
    comentarios: [],
    webhooks: [],
    accionesDisponibles: ['silenciar', 'resolver'],
    ...parcial,
  }
}

describe('los 4 tabs del ticket', () => {
  it('son los de la ficha §6 y se dibujan los 4, incluido el que no tiene fuente', () => {
    expect(TABS_DEL_TICKET).toEqual(['resumen', 'timeline', 'regla', 'integraciones'])
  })

  it('las claves se arman por concatenacion sobre los 4 codigos', () => {
    for (const tab of TABS_DEL_TICKET) {
      expect(claveDeTabDelTicket(tab)).toBe(`centro.ticket.tabs.${tab}`)
    }
  })

  /**
   * REGRESIÓN. `webhooks[]` llega `[]` SIEMPRE (DRIFT 7: ninguna columna ata una entrega a un
   * problema). Un `(0)` al lado de "Integraciones" se lee como "cero entregas", que es una
   * afirmación sobre los envíos y es falsa. El panel lo dice con palabras.
   */
  it('solo el tab de la linea de tiempo lleva contador', () => {
    expect(tabLlevaContador('timeline')).toBe(true)
    expect(tabLlevaContador('integraciones')).toBe(false)
    expect(tabLlevaContador('resumen')).toBe(false)
    expect(tabLlevaContador('regla')).toBe(false)
  })
})

describe('la prioridad explicada (DRIFT 8)', () => {
  it('la suma es la de los 7 factores, incluidos los que valen 0', () => {
    const factores = FACTORES_PRIORIDAD.map((codigo, indice) => ({
      codigo,
      etiqueta: '',
      puntos: indice,
      explicacion: '',
    }))

    expect(sumaDeFactores(prioridad({ factores }))).toBe(0 + 1 + 2 + 3 + 4 + 5 + 6)
  })

  it('cuando los factores explican toda la prioridad, no hay desfasaje', () => {
    const factores = FACTORES_PRIORIDAD.map((codigo, indice) => ({
      codigo,
      etiqueta: '',
      puntos: indice === 0 ? 60 : 0,
      explicacion: '',
    }))

    const p = prioridad({ prioridad: 60, factores })

    expect(desfasajeDePrioridad(p)).toBe(0)
    expect(hayDesfasajeDePrioridad(p)).toBe(false)
  })

  /**
   * ⚠️ Este caso es el que `f-09` paso 4 declara imposible ("la suma mostrada debe ser exactamente
   * la prioridad del hero") y que el contrato declara **normal**: 3 de los 7 factores se recomponen
   * al leer y no tienen snapshot. Anclar el cuadre como invariante de pantalla rompería la UI con
   * datos legítimos. Manda `00-contrato/` sobre `03-build/`.
   */
  it('la suma puede ser MENOR que la prioridad persistida, y eso no es un error', () => {
    const p = prioridad({ prioridad: 78, factores: prioridad().factores })

    expect(sumaDeFactores(p)).toBe(0)
    expect(desfasajeDePrioridad(p)).toBe(78)
    expect(hayDesfasajeDePrioridad(p)).toBe(true)
  })
})

describe('lo que el ticket declara que NO puede dibujar', () => {
  it('el contexto de la regla no tiene fuente: no hay vinculo problema -> regla', () => {
    expect(CONTEXTO_DE_REGLA_DISPONIBLE).toBe(false)
  })

  it('la correlacion problema <-> entrega de webhook no existe', () => {
    expect(CORRELACION_PROBLEMA_WEBHOOK_DISPONIBLE).toBe(false)
  })

  it('comentar no esta enrutado, asi que no hay input de comentario', () => {
    expect(COMENTARIOS_DISPONIBLES).toBe(false)
  })

  it('no hay acciones de incidente: el cluster no existe en el contrato', () => {
    expect(ACCIONES_DE_INCIDENTE_DISPONIBLES).toBe(false)
  })

  it('"Contactar conductor" no se dibuja: no puede dejar rastro en el timeline', () => {
    expect(CONTACTAR_CONDUCTOR_DISPONIBLE).toBe(false)
  })
})

describe('derivados del detalle', () => {
  it('el contador del feed NO suma los comentarios: son un subconjunto del timeline', () => {
    const fila = {
      id: 't-1',
      tipo: 'comentario' as const,
      titulo: 'Un comentario',
      detalle: null,
      usuario: null,
      fechaUtc: '2026-08-15T12:00:00Z',
    }

    expect(contarTimeline(detalle({ timeline: [fila], comentarios: [fila] }))).toBe(1)
  })

  /**
   * `accionesDisponibles` la deriva el SERVIDOR del estado. La pantalla la lee y no recalcula si un
   * problema cerrado admite resolver: recalcularlo es cómo dos superficies de la misma pantalla
   * terminan en desacuerdo.
   */
  it('un problema terminal llega sin acciones de mutacion, y se lee de la lista del server', () => {
    expect(tieneAccionesDeMutacion(detalle())).toBe(true)
    expect(
      tieneAccionesDeMutacion(
        detalle({ estado: 'resuelto', accionesDisponibles: ['ver_vehiculo', 'ver_mapa'] }),
      ),
    ).toBe(false)
  })
})
