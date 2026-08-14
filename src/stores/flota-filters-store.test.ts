import { describe, expect, it } from 'vitest'
import {
  aQueryVehiculos,
  hayFiltrosVehiculosActivos,
  type EntradaQueryVehiculos,
  type FlotaFiltrosVehiculos,
} from './flota-filters-store'

/**
 * Los 2 filtros que slice-05 destrabó (`estado` de conexión y `situacion`) son los primeros de este
 * listado que pueden devolver vacío SIN que falte un dato: `estado` se compone desde Telemetría, así
 * que con Telemetría caída todo vale `sin_dato` y `estado=en_linea` no matchea nada.
 *
 * Lo que se ancla acá es la regla del DATO, que es donde vive: qué viaja al backend y qué no.
 */

const base: FlotaFiltrosVehiculos = {
  patente: '',
  estado: '',
  situacion: '',
  soloActivos: true,
  page: 1,
  pageSize: 20,
  sortBy: 'FechaCreacion',
  sortDirection: 'Desc',
}

describe('aQueryVehiculos', () => {
  it('OMITE los filtros vacíos en vez de mandarlos como cadena vacía', () => {
    // Un `estado=` vacío no matchea contra ningún código del vocabulario: devolvería lista vacía en
    // vez de la lista entera. "Sin filtro" y "filtro vacío" no son lo mismo para el backend.
    const query = aQueryVehiculos(base)

    expect(query).not.toHaveProperty('patente')
    expect(query).not.toHaveProperty('estado')
    expect(query).not.toHaveProperty('situacion')
    expect(query.soloActivos).toBe(true)
  })

  it('manda los 2 filtros que slice-05 destrabó, con su código snake_case sin traducir', () => {
    const query = aQueryVehiculos({ ...base, estado: 'desconectado', situacion: 'sin_conductor' })

    expect(query.estado).toBe('desconectado')
    expect(query.situacion).toBe('sin_conductor')
  })

  it('la pantalla que todavía no los lee sigue mandando lo mismo que antes', () => {
    // `EntradaQueryVehiculos` los deja opcionales a propósito: omitirlos es "sin filtro". Sin esto,
    // agregarlos al store rompía el typecheck de la página en el mismo commit.
    const sinCompuestos: EntradaQueryVehiculos = {
      patente: 'AB 123 CD',
      soloActivos: true,
      page: 1,
      pageSize: 20,
      sortBy: 'FechaCreacion',
      sortDirection: 'Desc',
    }

    const query = aQueryVehiculos(sinCompuestos)

    expect(query).not.toHaveProperty('estado')
    expect(query).not.toHaveProperty('situacion')
    expect(query.patente).toBe('AB 123 CD')
  })

  it('la patente se recorta: un input con espacios no es un filtro', () => {
    expect(aQueryVehiculos({ ...base, patente: '   ' })).not.toHaveProperty('patente')
  })
})

describe('hayFiltrosVehiculosActivos', () => {
  it('sin filtros, el vacío es "todavía no cargaste vehículos"', () => {
    expect(hayFiltrosVehiculosActivos(base)).toBe(false)
  })

  it('con un filtro compuesto puesto, el vacío es "ninguno coincide" — no "no tenés flota"', () => {
    // Es la diferencia entre los 2 empty-states. Decirle "todavía no cargaste vehículos" a alguien
    // que tiene 47 y filtró por "En línea" con Telemetría caída es la versión silenciosa de perder
    // los datos.
    expect(hayFiltrosVehiculosActivos({ ...base, estado: 'en_linea' })).toBe(true)
    expect(hayFiltrosVehiculosActivos({ ...base, situacion: 'con_dispositivo_gps' })).toBe(true)
  })
})
