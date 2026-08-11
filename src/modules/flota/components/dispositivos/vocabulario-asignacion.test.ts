import { describe, expect, it } from 'vitest'
import {
  MOTIVOS_CIERRE_MANUAL,
  QUERY_DISPOSITIVOS_EN_STOCK,
  tratamientoDeErrorAsignacion,
} from './vocabulario-asignacion'

/**
 * La clasificación de errores de asignación es la decisión más cara de este slice: los tres
 * tratamientos conviven en el MISMO par de status (409/500) y piden acciones OPUESTAS del usuario.
 * Un `if (status === 500)` los confunde y le da el consejo equivocado — y el caso peligroso
 * (`canonico_no_coordinable`) mostrado como genérico deja al usuario creyendo que el GPS quedó
 * instalado cuando no se persistió nada.
 *
 * Por eso se testea la función pura y no el render: es donde vive la regla.
 */
describe('tratamientoDeErrorAsignacion', () => {
  it('el fallo de coordinación canónica es su propio tratamiento, no un genérico', () => {
    // Este es EL caso: 500 reintentable, el backend no persistió nada (D-S3-13).
    expect(tratamientoDeErrorAsignacion('flota.dispositivo.canonico_no_coordinable')).toBe(
      'coordinacion',
    )
  })

  it('los rechazos de negocio son conflicto: reintentar lo mismo vuelve a fallar', () => {
    for (const code of [
      'flota.dispositivo.no_disponible',
      'flota.vehiculo.ya_tiene_dispositivo',
      'flota.vehiculo.conflicto_canonico',
      'flota.asignacion.canonico_inactivo',
    ]) {
      expect(tratamientoDeErrorAsignacion(code), code).toBe('conflicto')
    }
  })

  it('los 404 y el cross-tenant caen en noEncontrado, sin ofrecer reintento', () => {
    // `organizacion_invalida` va acá y no en conflicto a propósito: cross-tenant es 404 UNIFORME
    // (regla transversal del contrato), indistinguible de "no existe".
    for (const code of [
      'flota.vehiculo.no_existe',
      'flota.dispositivo.no_existe',
      'flota.dispositivo.canonico_no_existe',
      'flota.asignacion.no_existe',
      'flota.recurso.organizacion_invalida',
    ]) {
      expect(tratamientoDeErrorAsignacion(code), code).toBe('noEncontrado')
    }
  })

  it('sin code (caída de red) es genérico, que es el único que no promete nada', () => {
    // Un request que nunca volvió PUDO haber llegado. Prometer "no se guardó nada" acá sería el
    // mismo error que el genérico, con el signo cambiado.
    expect(tratamientoDeErrorAsignacion(null)).toBe('generico')
    expect(tratamientoDeErrorAsignacion('flota.dispositivo.imei_duplicado')).toBe('generico')
  })
})

describe('query de candidatos a asignar', () => {
  it('pide solo equipos en stock y activos: es la única elegibilidad que el backend acepta', () => {
    // Cualquier otro estado responde 409 `flota.dispositivo.no_disponible`, así que ofrecerlos sería
    // dibujar opciones que no se pueden elegir.
    expect(QUERY_DISPOSITIVOS_EN_STOCK.stock).toBe('en_stock')
    expect(QUERY_DISPOSITIVOS_EN_STOCK.soloActivos).toBe(true)
  })

  it('no pide más de 100, que es el techo que el contrato normaliza', () => {
    expect(QUERY_DISPOSITIVOS_EN_STOCK.pageSize).toBeLessThanOrEqual(100)
  })
})

describe('motivos de cierre que la UI ofrece', () => {
  it('no ofrece `reasignacion`: ese lo escribe el backend, no el usuario', () => {
    // Ofrecerlo en un cierre manual grabaría en el historial un reemplazo que nunca ocurrió
    // (D-S3-14). El backend lo aceptaría igual: la restricción es de UI y por eso se ancla acá.
    expect(MOTIVOS_CIERRE_MANUAL).not.toContain('reasignacion')
    expect(MOTIVOS_CIERRE_MANUAL).toEqual(['reparacion', 'baja', 'otro'])
  })
})
