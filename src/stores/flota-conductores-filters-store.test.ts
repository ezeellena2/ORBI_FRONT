import { beforeEach, describe, expect, it } from 'vitest'
import {
  aQueryConductores,
  hayFiltrosConductoresActivos,
  useFlotaConductoresFiltersStore,
  type FlotaFiltrosConductores,
} from './flota-conductores-filters-store'

/**
 * Los filtros del listado de conductores.
 *
 * Dos cosas que este archivo ancla y que ya fallaron en el modulo:
 *
 * 1. **Un filtro vacio se OMITE, no viaja como `''`.** `estado=` vacio no matchea contra ningun
 *    valor del vocabulario, asi que devolveria una lista VACIA en vez de la lista entera — el filtro
 *    "Todos" mostraria cero conductores.
 *
 * 2. **`estado=inactivo` con `soloActivos=on` es una barra que miente.** El backend resuelve la
 *    combinacion (ese valor levanta el query filter de `activo`, o si no seria inalcanzable por
 *    construccion), asi que la LISTA sale bien; lo que queda mal es el CONTROL, que muestra "Solo
 *    activos" encendido mientras la tabla lista inactivos. Los setters se cuidan mutuamente.
 */

const estadoInicial = useFlotaConductoresFiltersStore.getState()

beforeEach(() => {
  useFlotaConductoresFiltersStore.setState(estadoInicial, true)
  useFlotaConductoresFiltersStore.getState().resetFiltros()
})

const base: FlotaFiltrosConductores = {
  estado: '',
  asignacion: '',
  soloActivos: true,
  page: 1,
  pageSize: 20,
  sortBy: 'Nombre',
  sortDirection: 'Asc',
}

describe('aQueryConductores', () => {
  it('omite los filtros vacios en vez de mandarlos como string vacio', () => {
    const query = aQueryConductores(base)

    expect(query).not.toHaveProperty('estado')
    expect(query).not.toHaveProperty('asignacion')
    expect(query.soloActivos).toBe(true)
  })

  it('manda los valores literales del contrato cuando hay filtro', () => {
    const query = aQueryConductores({ ...base, estado: 'licencia_vencida', asignacion: 'con_vehiculo' })

    expect(query.estado).toBe('licencia_vencida')
    expect(query.asignacion).toBe('con_vehiculo')
  })

  it('el orden por defecto es Nombre ASC, el unico listado del modulo que no arranca en Desc', () => {
    const query = aQueryConductores(base)

    expect(query.sortBy).toBe('Nombre')
    expect(query.sortDirection).toBe('Asc')
  })

  it('NO manda `licencia`: el server no declara el parametro y devolveria la lista sin filtrar', () => {
    // El chip no existe en la UI; esto ancla que tampoco se cuele por el query.
    expect(aQueryConductores(base)).not.toHaveProperty('licencia')
  })

  it('NO manda `search`: el contrato no declara busqueda libre en este listado', () => {
    expect(aQueryConductores(base)).not.toHaveProperty('search')
  })
})

describe('hayFiltrosConductoresActivos', () => {
  it('con los defaults NO hay filtros: el vacio es de datos, no de resultados', () => {
    expect(hayFiltrosConductoresActivos(base)).toBe(false)
  })

  it('apagar "solo activos" YA cuenta como filtro activo', () => {
    expect(hayFiltrosConductoresActivos({ ...base, soloActivos: false })).toBe(true)
  })

  it('la pagina y el orden NO cuentan como filtro', () => {
    expect(hayFiltrosConductoresActivos({ ...base, page: 4, sortDirection: 'Desc' })).toBe(false)
  })
})

describe('el par contradictorio se desarma solo', () => {
  it('filtrar por "inactivos" apaga "solo activos": si no, la barra dice lo contrario que la tabla', () => {
    useFlotaConductoresFiltersStore.getState().setEstado('inactivo')

    const estado = useFlotaConductoresFiltersStore.getState()
    expect(estado.estado).toBe('inactivo')
    expect(estado.soloActivos).toBe(false)
  })

  it('volver a encender "solo activos" saca el filtro de inactivos', () => {
    useFlotaConductoresFiltersStore.getState().setEstado('inactivo')
    useFlotaConductoresFiltersStore.getState().setSoloActivos(true)

    const estado = useFlotaConductoresFiltersStore.getState()
    expect(estado.soloActivos).toBe(true)
    expect(estado.estado).toBe('')
  })

  it('los otros valores de estado NO tocan "solo activos"', () => {
    useFlotaConductoresFiltersStore.getState().setEstado('licencia_proxima_a_vencer')

    const estado = useFlotaConductoresFiltersStore.getState()
    expect(estado.estado).toBe('licencia_proxima_a_vencer')
    expect(estado.soloActivos).toBe(true)
  })

  it('cambiar cualquier filtro vuelve a la pagina 1', () => {
    useFlotaConductoresFiltersStore.getState().setPage(5)
    useFlotaConductoresFiltersStore.getState().setAsignacion('sin_vehiculo')

    expect(useFlotaConductoresFiltersStore.getState().page).toBe(1)
  })

  it('cambiar el tamano de pagina tambien vuelve a la pagina 1', () => {
    useFlotaConductoresFiltersStore.getState().setPage(3)
    useFlotaConductoresFiltersStore.getState().setPageSize(50)

    const estado = useFlotaConductoresFiltersStore.getState()
    expect(estado.pageSize).toBe(50)
    expect(estado.page).toBe(1)
  })
})
