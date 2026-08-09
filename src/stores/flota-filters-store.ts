import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  SortDirection,
  VehiculoSortBy,
  VehiculosPageQuery,
} from '@/services/contracts/flota'

/**
 * Filtros del listado de vehiculos — `frontend.md` §5.
 *
 * ALCANCE DEL SLICE-02: solo lo que el backend sabe filtrar hoy (`patente`, `soloActivos`) mas la
 * paginacion y el orden. Los filtros `estado` (conexion), `situacion` (con/sin GPS, con/sin
 * conductor) y `tipo` que documenta `api.md` NO se cablean: `VehiculosPageQuery` del backend no los
 * declara porque no tienen fuente hasta los slices 03/04/05. Un filtro que no filtra es peor que
 * un filtro ausente.
 *
 * Vive en `stores/` y no en `modules/flota/state/` por decision B-20.
 */

export const PAGE_SIZE_DEFAULT = 20
export const SORT_BY_DEFAULT: VehiculoSortBy = 'FechaCreacion'
export const SORT_DIRECTION_DEFAULT: SortDirection = 'Desc'

export interface FlotaFiltrosVehiculos {
  patente: string
  soloActivos: boolean
  page: number
  pageSize: number
  sortBy: VehiculoSortBy
  sortDirection: SortDirection
}

export interface FlotaFiltersState extends FlotaFiltrosVehiculos {
  setPatente: (patente: string) => void
  setSoloActivos: (soloActivos: boolean) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setOrden: (sortBy: VehiculoSortBy, sortDirection: SortDirection) => void
  resetFiltros: () => void
}

const defaults: FlotaFiltrosVehiculos = {
  patente: '',
  soloActivos: true,
  page: 1,
  pageSize: PAGE_SIZE_DEFAULT,
  sortBy: SORT_BY_DEFAULT,
  sortDirection: SORT_DIRECTION_DEFAULT,
}

export const useFlotaFiltersStore = create<FlotaFiltersState>()(
  persist(
    (set) => ({
      ...defaults,

      // Cambiar un filtro vuelve a la pagina 1: sin esto, buscar una patente estando en la pagina 7
      // devuelve una pagina vacia y parece que no hay resultados.
      setPatente: (patente) => set({ patente, page: 1 }),
      setSoloActivos: (soloActivos) => set({ soloActivos, page: 1 }),
      setPage: (page) => set({ page }),
      setPageSize: (pageSize) => set({ pageSize, page: 1 }),
      setOrden: (sortBy, sortDirection) => set({ sortBy, sortDirection, page: 1 }),
      resetFiltros: () => set(defaults),
    }),
    {
      name: 'flota-filters',
      // `page` no se persiste: es posicion dentro de un resultado, no una preferencia. Volver al
      // modulo dias despues y aterrizar en la pagina 7 de un listado que cambio no es util.
      partialize: (state) => ({
        patente: state.patente,
        soloActivos: state.soloActivos,
        pageSize: state.pageSize,
        sortBy: state.sortBy,
        sortDirection: state.sortDirection,
      }),
    },
  ),
)

/**
 * Traduce el estado del store al query del contrato. Funcion pura (no es un hook): la pagina la
 * llama con lo que leyo del store y se lo pasa a `useVehiculos`.
 *
 * ⚠️ LEER CON SELECTORES POR CAMPO, nunca `useFlotaFiltersStore((s) => s)` ni un selector que
 * devuelva un objeto nuevo: zustand 5 compara por identidad y un objeto recien creado en cada
 * render dispara un bucle infinito de re-render. El patron correcto es:
 *
 *   const patente = useFlotaFiltersStore((s) => s.patente)
 *   const page = useFlotaFiltersStore((s) => s.page)
 *   ...
 *   const query = aQueryVehiculos({ patente, page, ... })
 *
 * `patente` vacia se omite: el backend distingue "sin filtro" de "filtro vacio".
 */
export function aQueryVehiculos(filtros: FlotaFiltrosVehiculos): VehiculosPageQuery {
  const patente = filtros.patente.trim()

  return {
    page: filtros.page,
    pageSize: filtros.pageSize,
    sortBy: filtros.sortBy,
    sortDirection: filtros.sortDirection,
    soloActivos: filtros.soloActivos,
    ...(patente.length > 0 ? { patente } : {}),
  }
}
