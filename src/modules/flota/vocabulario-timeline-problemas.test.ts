import { describe, expect, it } from 'vitest'
import type { OrigenSenal, ProblemaOperativoListItemDto } from '@/services/contracts/flota'
import { ORIGENES_SENAL } from './vocabulario-centro-problemas'
import {
  CLUSTERS_EN_TIMELINE_DISPONIBLES,
  INSIGHTS_DERIVADOS_DISPONIBLES,
  RANGO_TEMPORAL_ELEGIBLE,
  VENTANA_MINIMA_MS,
  carrilesPorOrigen,
  contarFueraDeLosCarriles,
  instanteDeDeteccion,
  marcasDelEje,
  posicionEnLaVentana,
  ventanaDelTimeline,
} from './vocabulario-timeline-problemas'

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

const AHORA = Date.parse('2026-08-15T18:00:00Z')

describe('ventana del timeline', () => {
  it('va del evento mas viejo hasta AHORA', () => {
    const items = [
      problema({ id: 'a', fechaDeteccionUtc: '2026-08-15T09:00:00Z' }),
      problema({ id: 'b', fechaDeteccionUtc: '2026-08-15T15:00:00Z' }),
    ]

    expect(ventanaDelTimeline(items, AHORA)).toEqual({
      desdeMs: Date.parse('2026-08-15T09:00:00Z'),
      hastaMs: AHORA,
    })
  })

  /**
   * El desfasaje entre el reloj del cliente y el del servidor no puede hacer DESAPARECER un
   * problema: si el evento más nuevo es "futuro" para este navegador, la ventana se estira hasta él.
   */
  it('un evento posterior al reloj del cliente estira la ventana en vez de quedar afuera', () => {
    const futuro = '2026-08-15T18:05:00Z'
    const ventana = ventanaDelTimeline([problema({ fechaDeteccionUtc: futuro })], AHORA)

    expect(ventana?.hastaMs).toBe(Date.parse(futuro))
  })

  /** Sin piso, un solo evento da ancho 0 y todo se amontona en un punto (o divide por cero). */
  it('con un solo evento la ventana tiene el ancho minimo de 1 hora', () => {
    const ventana = ventanaDelTimeline(
      [problema({ fechaDeteccionUtc: '2026-08-15T18:00:00Z' })],
      AHORA,
    )

    expect(ventana).not.toBeNull()
    expect((ventana as { hastaMs: number; desdeMs: number }).hastaMs -
      (ventana as { hastaMs: number; desdeMs: number }).desdeMs).toBe(VENTANA_MINIMA_MS)
  })

  it('sin eventos ubicables no hay ventana que declarar', () => {
    expect(ventanaDelTimeline([], AHORA)).toBeNull()
    expect(ventanaDelTimeline([problema({ fechaDeteccionUtc: 'no-es-fecha' })], AHORA)).toBeNull()
  })
})

describe('posicion en la ventana', () => {
  const ventana = {
    desdeMs: Date.parse('2026-08-15T12:00:00Z'),
    hastaMs: Date.parse('2026-08-15T16:00:00Z'),
  }

  it('el borde izquierdo es 0 y el derecho 100', () => {
    expect(posicionEnLaVentana(ventana.desdeMs, ventana)).toBe(0)
    expect(posicionEnLaVentana(ventana.hastaMs, ventana)).toBe(100)
  })

  it('la mitad de la ventana cae en 50', () => {
    expect(posicionEnLaVentana(Date.parse('2026-08-15T14:00:00Z'), ventana)).toBe(50)
  })

  /** Un evento que se sale del contenedor es un problema que el operador no ve. */
  it('lo que cae fuera se pega al borde en vez de salirse', () => {
    expect(posicionEnLaVentana(ventana.desdeMs - 1_000, ventana)).toBe(0)
    expect(posicionEnLaVentana(ventana.hastaMs + 1_000, ventana)).toBe(100)
  })
})

describe('marcas del eje', () => {
  it('reparte la cantidad pedida incluyendo los 2 extremos', () => {
    const ventana = { desdeMs: 0, hastaMs: 4_000 }
    expect(marcasDelEje(ventana, 5)).toEqual([0, 1_000, 2_000, 3_000, 4_000])
  })

  it('nunca devuelve menos de 2 marcas', () => {
    expect(marcasDelEje({ desdeMs: 0, hastaMs: 100 }, 1)).toHaveLength(2)
  })
})

describe('carriles por origen', () => {
  it('son los 8 del catalogo, siempre, incluso vacios', () => {
    const carriles = carrilesPorOrigen([])
    expect(carriles.map((c) => c.origen)).toEqual([...ORIGENES_SENAL])
  })

  /** DIFERIDO DA-08: el carril se conserva en el layout y nunca se puebla. */
  it('el carril de geozona existe y queda vacio', () => {
    const carriles = carrilesPorOrigen([problema({ origenes: ['telemetria', 'diagnostico'] })])
    const geozona = carriles.find((c) => c.origen === 'geozona')

    expect(geozona).toBeDefined()
    expect(geozona?.eventos).toHaveLength(0)
  })

  /**
   * Un problema con 2 orígenes sale en los 2 carriles: es **el mismo caso** visto desde dos
   * orígenes. Por eso los conteos por carril NO suman el total de la página, y la vista lo dice.
   */
  it('un problema con 2 origenes aparece en los 2 carriles', () => {
    const items = [problema({ id: 'a', origenes: ['telemetria', 'dispositivo'] })]
    const carriles = carrilesPorOrigen(items)

    const con = carriles.filter((c) => c.eventos.length > 0).map((c) => c.origen)
    expect(con).toEqual<OrigenSenal[]>(['telemetria', 'dispositivo'])
  })

  it('cuenta los criticos por carril', () => {
    const items = [
      problema({ id: 'a', severidad: 'critica' }),
      problema({ id: 'b', severidad: 'alta' }),
    ]
    const telemetria = carrilesPorOrigen(items).find((c) => c.origen === 'telemetria')

    expect(telemetria?.eventos).toHaveLength(2)
    expect(telemetria?.criticos).toBe(1)
  })

  it('un evento con fecha ilegible no entra a ningun carril', () => {
    const carriles = carrilesPorOrigen([problema({ fechaDeteccionUtc: 'no-es-fecha' })])
    expect(carriles.every((c) => c.eventos.length === 0)).toBe(true)
  })
})

describe('los que quedan fuera de todos los carriles', () => {
  /**
   * REGRESIÓN. Sin este conteo, un problema con `origenes: []` (el contrato lo declara posible)
   * desaparece de la vista **sin dejar rastro**: el operador ve 7 de 9 y no tiene cómo saberlo.
   */
  it('cuenta los que no tienen origen', () => {
    const items = [problema({ id: 'a', origenes: [] }), problema({ id: 'b' })]
    expect(contarFueraDeLosCarriles(items)).toBe(1)
  })

  it('cuenta tambien los que no se pueden ubicar en el eje', () => {
    expect(contarFueraDeLosCarriles([problema({ fechaDeteccionUtc: 'roto' })])).toBe(1)
  })

  it('con todo ubicable devuelve 0', () => {
    expect(contarFueraDeLosCarriles([problema()])).toBe(0)
  })
})

describe('lo que la linea de tiempo declara que NO dibuja', () => {
  it('el rango temporal no es elegible: api.md no declara desde/hasta (B-17)', () => {
    expect(RANGO_TEMPORAL_ELEGIBLE).toBe(false)
  })

  it('no hay clusters: el contrato no tiene el concepto de incidente', () => {
    expect(CLUSTERS_EN_TIMELINE_DISPONIBLES).toBe(false)
  })

  it('no hay insights derivados: no existe endpoint de resumen (DA-PC-01)', () => {
    expect(INSIGHTS_DERIVADOS_DISPONIBLES).toBe(false)
  })
})

describe('instanteDeDeteccion', () => {
  it('devuelve null si la fecha no parsea, para no dibujar NaN%', () => {
    expect(instanteDeDeteccion(problema({ fechaDeteccionUtc: 'x' }))).toBeNull()
  })
})
