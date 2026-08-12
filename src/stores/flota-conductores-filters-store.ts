import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ConductorSortBy,
  ConductoresPageQuery,
  FiltroAsignacionConductor,
  FiltroEstadoConductor,
  SortDirection,
} from '@/services/contracts/flota'

/**
 * Filtros del listado de conductores — `frontend.md` §5, mismo patron que `flota-filters-store`
 * (vehiculos) y `flota-dispositivos-filters-store`. Store separado a proposito: son listados
 * distintos y compartir `page`/`pageSize` haria que paginar conductores moviera dispositivos.
 *
 * CABLEADO HOY — los 3 filtros que el server DECLARA (`api.md` §Conductores, tabla de estado):
 *  - `estado`: `activo` | `inactivo` | `licencia_proxima_a_vencer` | `licencia_vencida`. ✅
 *  - `asignacion`: `con_vehiculo` | `sin_vehiculo`. ✅ (`EXISTS` intra-schema con `hasta IS NULL`)
 *  - `soloActivos`: default **on**. ✅
 *
 * Lo que NO se cablea, y no es un olvido:
 *  - `licencia` (`a`|`b1`|…|`e2`) ❌ — `api.md` lo contrata y el server **NO DECLARA el parametro**:
 *    la categoria de licencia **no tiene columna en ninguna tabla** (**B-21**, bloqueante del PO). Un
 *    query param que el binder no conoce se descarta SIN ERROR, asi que mandarlo devuelve 200 con la
 *    lista ENTERA sin filtrar. Un filtro que miente es peor que un filtro ausente: el chip no se
 *    dibuja hasta que la fila de `api.md` diga ✅.
 *  - busqueda libre ❌ — `GET /conductores` **no declara `search`**. El input no se pinta "por las
 *    dudas".
 *  - `pendiente_documentacion` como valor de `estado` ❌ — el vocabulario del filtro cierra en 4 y
 *    NINGUNO de los 5 codigos del catalogo operativo es un valor valido (el filtro mira el flag
 *    `activo`, no el estado operativo). La opcion del mockup no tiene valor de contrato.
 */

export const PAGE_SIZE_CONDUCTORES_DEFAULT = 20
/** ⚠️ El unico listado del modulo cuyo default NO es `FechaCreacion` Desc (`api.md` §Conductores). */
export const SORT_BY_CONDUCTORES_DEFAULT: ConductorSortBy = 'Nombre'
export const SORT_DIRECTION_CONDUCTORES_DEFAULT: SortDirection = 'Asc'

/** `''` = "Todos". No viaja al backend: ausente y "todos" son lo mismo. */
export type FiltroEstado = FiltroEstadoConductor | ''

/** `''` = "Con y sin vehiculo". */
export type FiltroAsignacion = FiltroAsignacionConductor | ''

export interface FlotaFiltrosConductores {
  estado: FiltroEstado
  asignacion: FiltroAsignacion
  soloActivos: boolean
  page: number
  pageSize: number
  sortBy: ConductorSortBy
  sortDirection: SortDirection
}

export interface FlotaConductoresFiltersState extends FlotaFiltrosConductores {
  setEstado: (estado: FiltroEstado) => void
  setAsignacion: (asignacion: FiltroAsignacion) => void
  setSoloActivos: (soloActivos: boolean) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setOrden: (sortBy: ConductorSortBy, sortDirection: SortDirection) => void
  resetFiltros: () => void
}

const defaults: FlotaFiltrosConductores = {
  estado: '',
  asignacion: '',
  soloActivos: true,
  page: 1,
  pageSize: PAGE_SIZE_CONDUCTORES_DEFAULT,
  sortBy: SORT_BY_CONDUCTORES_DEFAULT,
  sortDirection: SORT_DIRECTION_CONDUCTORES_DEFAULT,
}

export const useFlotaConductoresFiltersStore = create<FlotaConductoresFiltersState>()(
  persist(
    (set) => ({
      ...defaults,

      // Cambiar un filtro vuelve a la pagina 1: sin esto, filtrar estando en la pagina 5 devuelve
      // una pagina vacia y parece que no hay resultados.
      //
      // ── EL PAR CONTRADICTORIO SE DESARMA SOLO ─────────────────────────────────────────────────
      // `estado = 'inactivo'` pide justo lo que `soloActivos = true` esconde. El backend YA lo
      // resuelve (ese valor levanta el query filter de `activo` aunque `soloActivos` siga en `true`,
      // porque si no seria inalcanzable por construccion), asi que la lista igual saldria bien — el
      // problema es de la BARRA: mostraria "Solo activos" encendido mientras la tabla lista
      // inactivos, y el usuario no tendria forma de entender que esta viendo.
      //
      // Se apaga el toggle a la vista, que es la version honesta: el control refleja lo que se pide.
      // Los dos setters se cuidan mutuamente para que el par nunca llegue a existir.
      setEstado: (estado) =>
        set(estado === 'inactivo' ? { estado, soloActivos: false, page: 1 } : { estado, page: 1 }),
      setAsignacion: (asignacion) => set({ asignacion, page: 1 }),
      setSoloActivos: (soloActivos) =>
        set((actual) =>
          soloActivos && actual.estado === 'inactivo'
            ? { soloActivos, estado: '', page: 1 }
            : { soloActivos, page: 1 },
        ),
      setPage: (page) => set({ page }),
      setPageSize: (pageSize) => set({ pageSize, page: 1 }),
      setOrden: (sortBy, sortDirection) => set({ sortBy, sortDirection, page: 1 }),
      resetFiltros: () => set(defaults),
    }),
    {
      name: 'flota-conductores-filters',
      // `page` no se persiste: es posicion dentro de un resultado, no una preferencia.
      partialize: (state) => ({
        estado: state.estado,
        asignacion: state.asignacion,
        soloActivos: state.soloActivos,
        pageSize: state.pageSize,
        sortBy: state.sortBy,
        sortDirection: state.sortDirection,
      }),
    },
  ),
)

/**
 * Traduce el estado del store al query del contrato. Funcion pura (no es un hook).
 *
 * ⚠️ LEER CON SELECTORES POR CAMPO, nunca con un selector que devuelva un objeto nuevo: zustand 5
 * compara por identidad y un objeto recien creado en cada render dispara un bucle de re-render.
 *
 * Los filtros vacios se OMITEN en vez de viajar como `''`: `estado=` vacio no matchea contra ningun
 * valor del vocabulario, o sea que devolveria una lista vacia en vez de la lista entera.
 */
export function aQueryConductores(filtros: FlotaFiltrosConductores): ConductoresPageQuery {
  return {
    page: filtros.page,
    pageSize: filtros.pageSize,
    sortBy: filtros.sortBy,
    sortDirection: filtros.sortDirection,
    soloActivos: filtros.soloActivos,
    ...(filtros.estado === '' ? {} : { estado: filtros.estado }),
    ...(filtros.asignacion === '' ? {} : { asignacion: filtros.asignacion }),
  }
}

/** ¿Hay algo que "Limpiar"? Decide cual de los dos vacios muestra la pantalla. */
export function hayFiltrosConductoresActivos(filtros: FlotaFiltrosConductores): boolean {
  return (
    filtros.estado !== '' ||
    filtros.asignacion !== '' ||
    filtros.soloActivos !== defaults.soloActivos
  )
}
