import { describe, expect, it } from 'vitest'
import es from '@/shared/i18n/locales/es-AR/flota.json'
import en from '@/shared/i18n/locales/en/flota.json'
import type {
  ProblemaOperativoListItemDto,
  ProblemaSlaDto,
} from '@/services/contracts/flota'
import {
  INCIDENTES_AGRUPADOS_DISPONIBLES,
  TABS_DE_LA_COLA_DISPONIBLES,
  VENTANAS_DE_SILENCIO_MINUTOS,
  claveDelVacioDeLaBandeja,
  descripcionDelVehiculo,
  esAccionDeNavegacion,
  hayMasDeUnaPagina,
  lecturaDeSla,
  motivoDeBloqueoDeAccion,
  otrosProblemasDelMismoVehiculo,
  patenteDelProblema,
  permisoDeAccion,
  resumenDeLaPagina,
  silenciarHastaUtc,
} from './vocabulario-sala-problemas'

/**
 * Texto real del locale. Se lee el JSON y no `t()`: lo que hay que anclar es **el copy**, no el
 * cableado de i18next.
 */
function textoDeClave(idioma: 'es-AR' | 'en', clave: string): string {
  const diccionario: unknown = idioma === 'es-AR' ? es : en
  const valor = clave
    .split('.')
    .reduce<unknown>(
      (nodo, tramo) =>
        typeof nodo === 'object' && nodo !== null
          ? (nodo as Record<string, unknown>)[tramo]
          : undefined,
      diccionario,
    )

  expect(typeof valor, `${clave} falta o no es texto en ${idioma}`).toBe('string')
  return valor as string
}

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

const sla = (parcial: Partial<ProblemaSlaDto>): ProblemaSlaDto => ({
  venceUtc: '2026-08-15T13:00:00Z',
  estado: 'vigente',
  minutosRestantes: 30,
  ...parcial,
})

describe('lo que la Sala declara que NO puede dibujar', () => {
  /**
   * REGRESIÓN. Estas 3 constantes son la razón por la que la cola es UNA lista sin tabs y sin
   * sección de incidentes. El día que alguien agregue el campo al contrato, este test se pone rojo
   * y obliga a revisar la pantalla en vez de dejarla recortada para siempre.
   */
  it('el agrupamiento por incidente no esta disponible: el contrato no tiene el campo', () => {
    expect(INCIDENTES_AGRUPADOS_DISPONIBLES).toBe(false)
  })

  it('los tabs Abiertos/Resueltos no estan disponibles: GET /problemas no filtra por estado', () => {
    expect(TABS_DE_LA_COLA_DISPONIBLES).toBe(false)
  })

  /**
   * REGRESIÓN de la mentira que corrigió el cierre de slice-06: el vacío de la bandeja **no puede
   * afirmar una causa que esta pantalla nunca consultó**. Antes elegía entre 2 copys con un flag
   * escrito a mano, y el que salía siempre decía "ninguna regla está activa en tu organización" —
   * sobre una pantalla que no pide reglas y en un módulo donde el usuario puede crear una y
   * activarla desde la pantalla de al lado.
   *
   * El vacío es **uno**, y lo que dice es el mecanismo, no el estado de la organización.
   */
  it('el vacio de la bandeja es UNO y no afirma nada sobre las reglas de la organizacion', () => {
    expect(claveDelVacioDeLaBandeja()).toBe('centro.problemas.vacioDeLaBandeja')
  })

  /**
   * El copy, en los 2 idiomas: no puede volver a nombrar el estado de las reglas de la organización
   * (ni afirmar que la flota está bien). Se pone rojo si alguien "mejora" el texto hacia cualquiera
   * de las dos afirmaciones que este bloque existe para impedir.
   */
  it('el copy del vacio NO afirma ni el estado de las reglas ni que la flota este bien', () => {
    const prohibidas = [
      /ninguna regla/i,
      /no rule is active/i,
      /flota está tranquila/i,
      /todo en orden/i,
      /all clear/i,
      /everything is fine\b(?!\.)/i,
    ]

    for (const idioma of ['es-AR', 'en'] as const) {
      const copy = [
        textoDeClave(idioma, 'centro.problemas.vacioDeLaBandeja.titulo'),
        textoDeClave(idioma, 'centro.problemas.vacioDeLaBandeja.descripcion'),
      ].join(' ')

      for (const prohibida of prohibidas) {
        expect(prohibida.test(copy), `${idioma} / ${String(prohibida)}`).toBe(false)
      }
    }
  })
})

describe('resumen de la pagina', () => {
  it('cuenta criticos, plazo vencido y sin responsable sobre lo cargado', () => {
    const items = [
      problema({ id: 'a', severidad: 'critica', sla: sla({ estado: 'vencido', minutosRestantes: -5 }) }),
      problema({ id: 'b', severidad: 'alta', responsable: { usuarioId: 'u1', nombre: 'Ana' } }),
      problema({ id: 'c', severidad: 'critica' }),
    ]

    expect(resumenDeLaPagina(items)).toEqual({
      enPagina: 3,
      criticos: 2,
      plazoVencido: 1,
      sinResponsable: 2,
    })
  })

  /**
   * `por_vencer` NO se emite nunca (`EstadoSlaDerivado` solo devuelve vigente/vencido/sin_sla), así
   * que la tarjeta "Por vencer" de la ficha §3 mostraría 0 siempre — se lee como "no tenés ninguno
   * por vencer", que es una afirmación falsa. Lo que se cuenta es `vencido`.
   */
  it('NO cuenta por_vencer: ese estado no lo emite el backend', () => {
    const items = [problema({ sla: sla({ estado: 'por_vencer', minutosRestantes: 3 }) })]
    expect(resumenDeLaPagina(items).plazoVencido).toBe(0)
  })

  it('sobre una pagina vacia devuelve ceros y no explota', () => {
    expect(resumenDeLaPagina([])).toEqual({
      enPagina: 0,
      criticos: 0,
      plazoVencido: 0,
      sinResponsable: 0,
    })
  })
})

describe('hayMasDeUnaPagina', () => {
  const paginacion = (totalPages: number) => ({
    page: 1,
    pageSize: 20,
    itemCount: 20,
    totalItems: 20 * totalPages,
    totalPages,
    hasPreviousPage: false,
    hasNextPage: totalPages > 1,
    fromItem: 1,
    toItem: 20,
  })

  it('con una sola pagina no hace falta aclarar "en esta pagina"', () => {
    expect(hayMasDeUnaPagina(paginacion(1))).toBe(false)
  })

  it('con mas de una pagina si', () => {
    expect(hayMasDeUnaPagina(paginacion(3))).toBe(true)
  })

  it('sin paginacion en mano no afirma nada', () => {
    expect(hayMasDeUnaPagina(null)).toBe(false)
    expect(hayMasDeUnaPagina(undefined)).toBe(false)
  })
})

describe('otros problemas del mismo vehiculo', () => {
  const conVehiculo = (id: string, vehiculoFlotaId: string) =>
    problema({
      id,
      vehiculo: { vehiculoFlotaId, patente: 'AB123CD', descripcion: 'Ford Transit' },
    })

  it('trae los de la pagina que comparten vehiculo, sin el seleccionado', () => {
    const seleccionado = conVehiculo('a', 'v-1')
    const items = [seleccionado, conVehiculo('b', 'v-1'), conVehiculo('c', 'v-2')]

    expect(otrosProblemasDelMismoVehiculo(items, seleccionado).map((i) => i.id)).toEqual(['b'])
  })

  it('un problema SIN vehiculo no agrupa con los otros sin vehiculo', () => {
    const seleccionado = problema({ id: 'a', vehiculo: null })
    const items = [seleccionado, problema({ id: 'b', vehiculo: null })]

    expect(otrosProblemasDelMismoVehiculo(items, seleccionado)).toEqual([])
  })

  it('sin seleccion devuelve vacio', () => {
    expect(otrosProblemasDelMismoVehiculo([conVehiculo('a', 'v-1')], null)).toEqual([])
  })
})

describe('identidad del vehiculo', () => {
  /**
   * REGRESIÓN. `patente` puede ser el **string vacío** (el C# escribe `string.Empty` si la
   * proyección no la trae), no `null`. Un `patente ?? '—'` deja la celda en blanco.
   */
  it('la patente VACIA se trata como ausente, no como texto', () => {
    expect(patenteDelProblema({ vehiculoFlotaId: 'v', patente: '', descripcion: 'x' })).toBeNull()
    expect(patenteDelProblema({ vehiculoFlotaId: 'v', patente: '   ', descripcion: 'x' })).toBeNull()
  })

  it('la patente presente vuelve recortada', () => {
    expect(
      patenteDelProblema({ vehiculoFlotaId: 'v', patente: ' AB 123 CD ', descripcion: 'x' }),
    ).toBe('AB 123 CD')
  })

  it('sin vehiculo no hay patente ni descripcion', () => {
    expect(patenteDelProblema(null)).toBeNull()
    expect(descripcionDelVehiculo(null)).toBeNull()
  })

  it('la descripcion vacia tambien se trata como ausente', () => {
    expect(descripcionDelVehiculo({ vehiculoFlotaId: 'v', patente: 'A', descripcion: '' })).toBeNull()
  })
})

describe('lectura del SLA', () => {
  /** `sin_sla` NO es "a tiempo": el problema no tiene reloj. Son formas distintas a propósito. */
  it('sin plazo no es lo mismo que en plazo', () => {
    expect(lecturaDeSla({ venceUtc: null, estado: 'sin_sla', minutosRestantes: null })).toEqual({
      forma: 'sin_plazo',
    })
  })

  it('vencido usa el valor ABSOLUTO: los minutos restantes vienen negativos', () => {
    expect(lecturaDeSla(sla({ estado: 'vencido', minutosRestantes: -12 }))).toEqual({
      forma: 'vencido',
      minutos: 12,
    })
  })

  it('vigente devuelve los minutos que quedan', () => {
    expect(lecturaDeSla(sla({ estado: 'vigente', minutosRestantes: 30 }))).toEqual({
      forma: 'en_plazo',
      minutos: 30,
    })
  })

  it('con reloj pero sin numero no inventa un cero', () => {
    expect(lecturaDeSla(sla({ estado: 'vigente', minutosRestantes: null }))).toEqual({
      forma: 'sin_dato',
    })
  })
})

describe('la barra de acciones', () => {
  /**
   * REGRESIÓN de DA-PC-07: no existe endpoint de catálogo de asignables, así que "Asignar" no puede
   * enviarse. Si alguien lo cablea sin cerrar la DA, este test lo frena.
   */
  it('asignar esta bloqueada por contrato y trae su motivo', () => {
    expect(motivoDeBloqueoDeAccion('asignar')).toBe('centro.sala.acciones.asignarBloqueado')
  })

  it('silenciar y resolver NO estan bloqueadas', () => {
    expect(motivoDeBloqueoDeAccion('silenciar')).toBeNull()
    expect(motivoDeBloqueoDeAccion('resolver')).toBeNull()
  })

  it('las 2 acciones de navegacion se distinguen de las que mutan', () => {
    expect(esAccionDeNavegacion('ver_mapa')).toBe(true)
    expect(esAccionDeNavegacion('ver_vehiculo')).toBe(true)
    expect(esAccionDeNavegacion('resolver')).toBe(false)
  })

  it('cada accion declara su permiso del catalogo de 44', () => {
    expect(permisoDeAccion('asignar')).toBe('flota.problemas.asignar')
    expect(permisoDeAccion('silenciar')).toBe('flota.problemas.silenciar')
    expect(permisoDeAccion('resolver')).toBe('flota.problemas.resolver')
    // Navegar al vehiculo o al mapa NO usa un permiso de problemas: no existe `flota.mapa.*`.
    expect(permisoDeAccion('ver_mapa')).toBe('flota.vehiculos.leer')
    expect(permisoDeAccion('ver_vehiculo')).toBe('flota.vehiculos.leer')
  })
})

describe('ventanas de silencio', () => {
  /**
   * REGRESIÓN. La ficha §6 ofrece 3 ventanas y la tercera es "hasta fin de turno", que **ningún
   * documento define**. Ofrecer 8 h o las 18:00 sería inventar la jornada de la organización.
   */
  it('son 2 y no 3: "hasta fin de turno" no tiene definicion en el contrato', () => {
    expect([...VENTANAS_DE_SILENCIO_MINUTOS]).toEqual([30, 120])
  })

  it('el hasta se calcula desde AHORA, en ISO 8601 UTC', () => {
    const ahora = Date.parse('2026-08-15T12:00:00.000Z')
    expect(silenciarHastaUtc(ahora, 30)).toBe('2026-08-15T12:30:00.000Z')
    expect(silenciarHastaUtc(ahora, 120)).toBe('2026-08-15T14:00:00.000Z')
  })
})
