import { describe, expect, it, beforeEach } from 'vitest'
import {
  aQueryDispositivos,
  useFlotaDispositivosFiltersStore,
  type EntradaQueryDispositivos,
  type FlotaFiltrosDispositivos,
} from './flota-dispositivos-filters-store'

/**
 * REGRESION de la combinación de filtros que siempre devolvía cero.
 *
 * La baja de un dispositivo es COHERENTE (DA-DL-10): en la MISMA transacción pone `activo=false` y
 * `estado_stock='dado_de_baja'`. Y `soloActivos` viene en `true` por default. Resultado:
 * `stock=dado_de_baja` + `soloActivos=true` es vacío GARANTIZADO — el usuario elegía una de las 4
 * opciones legítimas del filtro (que `api.md` declara) y recibía siempre "ningún dispositivo coincide
 * con tus filtros", sin ninguna pista de cuál de los dos controles lo causaba.
 *
 * La regla vive en los setters del store y no en el render porque es una regla del DATO. Los dos
 * setters se cuidan mutuamente, así el par imposible nunca llega a existir.
 */

const estadoInicial = useFlotaDispositivosFiltersStore.getState()

beforeEach(() => {
  useFlotaDispositivosFiltersStore.setState(estadoInicial, true)
  useFlotaDispositivosFiltersStore.getState().resetFiltros()
})

describe('la combinación imposible de filtros se desarma sola', () => {
  it('filtrar por "dado de baja" apaga "solo activos": si no, el resultado es vacío garantizado', () => {
    useFlotaDispositivosFiltersStore.getState().setStock('dado_de_baja')

    const estado = useFlotaDispositivosFiltersStore.getState()
    expect(estado.stock).toBe('dado_de_baja')
    expect(estado.soloActivos).toBe(false)
  })

  it('volver a encender "solo activos" saca el filtro de baja, en vez de dejar la lista muda', () => {
    useFlotaDispositivosFiltersStore.getState().setStock('dado_de_baja')
    useFlotaDispositivosFiltersStore.getState().setSoloActivos(true)

    const estado = useFlotaDispositivosFiltersStore.getState()
    expect(estado.soloActivos).toBe(true)
    expect(estado.stock).toBe('')
  })

  it('los otros estados de stock NO tocan "solo activos"', () => {
    useFlotaDispositivosFiltersStore.getState().setStock('en_reparacion')

    const estado = useFlotaDispositivosFiltersStore.getState()
    expect(estado.stock).toBe('en_reparacion')
    expect(estado.soloActivos).toBe(true)
  })

  it('cambiar cualquier filtro vuelve a la página 1', () => {
    useFlotaDispositivosFiltersStore.getState().setPage(5)
    useFlotaDispositivosFiltersStore.getState().setAsignacion('sin_asignar')

    expect(useFlotaDispositivosFiltersStore.getState().page).toBe(1)
  })
})

describe('aQueryDispositivos', () => {
  const base: FlotaFiltrosDispositivos = {
    stock: '',
    modelo: '',
    asignacion: '',
    conexion: '',
    soloActivos: true,
    page: 1,
    pageSize: 20,
    sortBy: 'FechaCreacion',
    sortDirection: 'Desc',
  }

  it('OMITE los filtros vacíos en vez de mandarlos como cadena vacía', () => {
    // Un `stock=` vacío no matchea contra ningún código del catálogo: devolvería una lista vacía
    // en vez de la lista entera. "Sin filtro" y "filtro vacío" no son lo mismo para el backend.
    const query = aQueryDispositivos(base)

    expect(query).not.toHaveProperty('stock')
    expect(query).not.toHaveProperty('modelo')
    expect(query).not.toHaveProperty('asignacion')
    expect(query).not.toHaveProperty('conexion')
  })

  it('SÍ manda `conexion` cuando hay valor: el server lo declara desde slice-05 `f-03`', () => {
    // Este test decía lo contrario ("el server no declara el parámetro", D-S3-33) y quedó viejo el
    // 2026-08-12: `DispositivosPageQuery` lo declara y filtra ANTES de paginar. Dejarlo como estaba
    // anclaba la ausencia de un filtro que ya existe.
    expect(aQueryDispositivos({ ...base, conexion: 'desconectado' })).toHaveProperty(
      'conexion',
      'desconectado',
    )
  })

  it('la pantalla que todavía no lee `conexion` sigue mandando lo mismo que antes', () => {
    // `EntradaQueryDispositivos` lo deja opcional a propósito: omitirlo es "sin filtro", no `''`.
    // Sin esto, agregar el filtro al store rompía el typecheck de la página en el mismo commit.
    const sinConexion: EntradaQueryDispositivos = {
      stock: 'en_stock',
      modelo: '',
      asignacion: '',
      soloActivos: true,
      page: 1,
      pageSize: 20,
      sortBy: 'FechaCreacion',
      sortDirection: 'Desc',
    }

    expect(aQueryDispositivos(sinConexion)).not.toHaveProperty('conexion')
    expect(aQueryDispositivos(sinConexion)).toHaveProperty('stock', 'en_stock')
  })
})
