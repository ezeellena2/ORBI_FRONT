import { describe, expect, it } from 'vitest'
import {
  badgeDeEstadoConductor,
  destinosDeEstadoConductor,
  identidadDeConductor,
  MOTIVO_CIERRE_POR_CAMBIO,
  pasosDeCambioDeConductor,
  pillDeConductores,
  QUERY_CONDUCTORES_SIN_VEHICULO,
  tratamientoDeErrorAsignacionConductor,
} from './vocabulario-conductor-asignacion'

/**
 * Las 3 reglas puras de este vocabulario son las que más fácil se "arreglan" mal: la matriz de
 * transiciones invita a agregar atajos por simetría, el badge 5→3 invita a derivar `activo` del
 * estado, y la clasificación de errores invita a ramificar por status. Se anclan acá, que es donde
 * viven, y no en el render.
 */
describe('matriz de transiciones del conductor', () => {
  it('NO ofrece `en_servicio -> disponible` ni `disponible -> pausado`: esas aristas no existen', () => {
    // El camino declarado es `en_servicio -> pausado -> disponible`. El atajo "por simetría" es una
    // arista inventada y el backend lo rechaza con 409 `flota.conductor.transicion_invalida`.
    expect(destinosDeEstadoConductor('en_servicio')).not.toContain('disponible')
    expect(destinosDeEstadoConductor('disponible')).not.toContain('pausado')
  })

  it('`suspendido` no tiene ninguna salida (B-22): la lista es vacía, no parcial', () => {
    // Un botón "Rehabilitar" sería un 409 garantizado. La única salida hoy es baja + re-alta.
    expect(destinosDeEstadoConductor('suspendido')).toEqual([])
  })

  it('`suspendido` es destino desde cualquier estado menos desde sí mismo', () => {
    // "cualquiera -> suspendido" es una regla sobre el destino, no una arista fija; y el no-op está
    // rechazado por el dominio, así que `suspendido` no se lista a sí mismo.
    for (const origen of ['pendiente_documentacion', 'disponible', 'en_servicio', 'pausado'] as const) {
      expect(destinosDeEstadoConductor(origen), origen).toContain('suspendido')
    }
  })

  it('ningún estado se ofrece a sí mismo: el backend rechaza el no-op', () => {
    for (const origen of [
      'pendiente_documentacion',
      'disponible',
      'en_servicio',
      'pausado',
      'suspendido',
    ] as const) {
      expect(destinosDeEstadoConductor(origen), origen).not.toContain(origen)
    }
  })

  it('`pendiente_documentacion` nunca es destino: el contrato lo excluye por tipo', () => {
    for (const origen of [
      'pendiente_documentacion',
      'disponible',
      'en_servicio',
      'pausado',
      'suspendido',
    ] as const) {
      expect(destinosDeEstadoConductor(origen), origen).not.toContain('pendiente_documentacion')
    }
  })
})

describe('badge de estado (agrupación 5→3, presentación)', () => {
  it('la baja lógica GANA sobre el estado operativo', () => {
    // Los dos ejes son ortogonales (DA-CD2-19): un conductor dado de baja conserva su estado. Lo que
    // el usuario necesita ver primero es que está de baja.
    expect(badgeDeEstadoConductor('en_servicio', false)).toBe('inactivo')
    expect(badgeDeEstadoConductor('pendiente_documentacion', false)).toBe('inactivo')
  })

  it('`suspendido` se muestra inactivo aunque `activo` sea true', () => {
    expect(badgeDeEstadoConductor('suspendido', true)).toBe('inactivo')
  })

  it('`pendiente_documentacion` activo es su propio badge, no "activo"', () => {
    expect(badgeDeEstadoConductor('pendiente_documentacion', true)).toBe('pendiente')
  })

  it('los 3 estados operables activos son un solo badge', () => {
    for (const estado of ['disponible', 'en_servicio', 'pausado'] as const) {
      expect(badgeDeEstadoConductor(estado, true), estado).toBe('activo')
    }
  })
})

describe('tratamientoDeErrorAsignacionConductor', () => {
  it('los rechazos por el estado del CONDUCTOR piden elegir otro, no reintentar', () => {
    // Reintentar con el mismo conductor vuelve a fallar siempre: está suspendido o su licencia
    // venció. El consejo correcto apunta al conductor, no a la operación.
    expect(tratamientoDeErrorAsignacionConductor('flota.conductor.suspendido_no_asignable')).toBe(
      'elegirOtro',
    )
    expect(tratamientoDeErrorAsignacionConductor('flota.conductor.licencia_vencida')).toBe(
      'elegirOtro',
    )
  })

  it('el cupo de principal ocupado es conflicto del VEHÍCULO: refrescar y elegir otro rol', () => {
    expect(tratamientoDeErrorAsignacionConductor('flota.vehiculo.ya_tiene_principal')).toBe(
      'conflicto',
    )
  })

  it('los 404 y el cross-tenant caen en noEncontrado, sin ofrecer reintento', () => {
    // `organizacion_invalida` va acá y no en conflicto a propósito: cross-tenant es 404 UNIFORME,
    // indistinguible de "no existe".
    for (const code of [
      'flota.vehiculo.no_existe',
      'flota.conductor.no_existe',
      'flota.asignacion.no_existe',
      'flota.recurso.organizacion_invalida',
    ]) {
      expect(tratamientoDeErrorAsignacionConductor(code), code).toBe('noEncontrado')
    }
  })

  it('sin code (caída de red) es genérico, que es el único que no promete nada', () => {
    expect(tratamientoDeErrorAsignacionConductor(null)).toBe('generico')
  })

  it('NO existe un tratamiento `coordinacion`: esta asignación no coordina con el Canónico', () => {
    // Es la diferencia real con el gemelo de dispositivo. `canonico_no_coordinable` no es emisor de
    // esta superficie; si apareciera, cae en genérico y no promete que no se guardó nada.
    expect(tratamientoDeErrorAsignacionConductor('flota.dispositivo.canonico_no_coordinable')).toBe(
      'generico',
    )
  })
})

describe('query de candidatos a asignar', () => {
  it('pide conductores SIN vehículo y activos', () => {
    expect(QUERY_CONDUCTORES_SIN_VEHICULO.asignacion).toBe('sin_vehiculo')
    expect(QUERY_CONDUCTORES_SIN_VEHICULO.soloActivos).toBe(true)
  })

  it('NO manda el filtro `licencia`: el server no lo declara y devolvería la lista sin filtrar', () => {
    // La categoría de licencia no tiene columna en ninguna tabla (B-21). Un query param no declarado
    // lo descarta el binder SIN ERROR: sería un filtro que miente.
    expect(QUERY_CONDUCTORES_SIN_VEHICULO).not.toHaveProperty('licencia')
  })

  it('no pide más de 100, que es el techo que el contrato normaliza', () => {
    expect(QUERY_CONDUCTORES_SIN_VEHICULO.pageSize).toBeLessThanOrEqual(100)
  })
})

/* ── f-07: lo que la ficha del VEHICULO puede afirmar sobre sus conductores ───────────────────── */

describe('identidad visible del conductor', () => {
  it('prefiere el nombre, después el documento y después el legajo', () => {
    expect(
      identidadDeConductor({ nombreCompleto: 'Ana Ruiz', dni: '30111222', numeroLegajo: 'L-7' }),
    ).toBe('Ana Ruiz')
    expect(identidadDeConductor({ nombreCompleto: null, dni: '30111222', numeroLegajo: 'L-7' })).toBe(
      '30111222',
    )
    expect(identidadDeConductor({ nombreCompleto: null, dni: null, numeroLegajo: 'L-7' })).toBe('L-7')
  })

  it('trata la cadena en blanco como ausente: un nombre de espacios no es identidad', () => {
    expect(identidadDeConductor({ nombreCompleto: '   ', dni: '30111222', numeroLegajo: null })).toBe(
      '30111222',
    )
  })

  it('devuelve null —no una frase— cuando el gate de PII no dejó pasar nada', () => {
    // El copy de fallback es i18n y vive en la superficie. Una función pura que devuelva texto
    // traducido no se puede testear sin arrastrar `t` hasta acá.
    expect(identidadDeConductor({ nombreCompleto: null, dni: null, numeroLegajo: null })).toBeNull()
  })
})

describe('pill del tab Conductor', () => {
  it('un conteo en 0 NO se pinta como 0: el backend no lo compone, así que es sin_dato', () => {
    // Es la regresión que más fácil vuelve: `conductoresCount` viene 0 SIEMPRE, también con
    // conductores asignados. Pintar ese 0 afirma "este vehículo no tiene conductores".
    expect(pillDeConductores(0, false)).toEqual({ tipo: 'sin_dato' })
  })

  it('con una asignación hecha en esta sesión afirma "al menos una", nunca "1"', () => {
    // Decir 1 exacto ignoraría a los secundarios que el DTO tampoco trae.
    expect(pillDeConductores(0, true)).toEqual({ tipo: 'al_menos', valor: 1 })
  })

  it('cuando el conteo llega (slice-05) manda el conteo, aunque haya asignación de sesión', () => {
    expect(pillDeConductores(3, true)).toEqual({ tipo: 'conteo', valor: 3 })
    expect(pillDeConductores(2, false)).toEqual({ tipo: 'conteo', valor: 2 })
  })
})

describe('pasos de "cambiar conductor" (DELETE + POST, sin atomicidad)', () => {
  it('sin asignación vigente conocida es UN solo POST', () => {
    expect(pasosDeCambioDeConductor(false, false)).toEqual(['asignar'])
  })

  it('con asignación vigente conocida cierra primero y asigna después, en ese orden', () => {
    expect(pasosDeCambioDeConductor(true, false)).toEqual(['cerrar', 'asignar'])
  })

  it('el reintento tras un cierre exitoso NO repite el DELETE', () => {
    // Repetirlo daría 404 `flota.asignacion.no_existe` y taparía el error real: que el POST falló y
    // el vehículo quedó sin conductor.
    expect(pasosDeCambioDeConductor(true, true)).toEqual(['asignar'])
  })

  it('el cierre por cambio se graba como `reasignacion`, que es lo que de verdad pasó', () => {
    // Inverso al gemelo de dispositivo, donde `reasignacion` lo escribe el backend y la UI no lo
    // ofrece. Acá el cierre lo emite la UI, así que cualquier otro código sería un motivo falso.
    expect(MOTIVO_CIERRE_POR_CAMBIO).toBe('reasignacion')
  })
})
