import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  DispositivoSortBy,
  DispositivosPageQuery,
  EstadoStockDispositivo,
  FiltroAsignacionDispositivo,
  SortDirection,
} from '@/services/contracts/flota'

/**
 * Filtros del listado de dispositivos GPS — `frontend.md` §5, mismo patron que
 * `flota-filters-store` (vehiculos). Store separado a proposito: son dos listados distintos y
 * compartir `page`/`pageSize` entre ellos haria que paginar dispositivos moviera vehiculos.
 *
 * CABLEADO HOY — los 4 filtros que el server DECLARA (`api.md`, tabla de D-S3-33):
 *  - `stock`: los 4 codigos del catalogo `estados_stock_dispositivo_flota`. ✅
 *  - `modelo`: el **uuid** de la fila del catalogo growable, NUNCA el nombre (B-18). ✅
 *  - `asignacion`: `asignado` | `sin_asignar`. ✅ desde **D-S3-33** — es un `EXISTS` sobre la
 *    asignacion con periodo abierto y **NO es equivalente a `stock=instalado`**: un dispositivo
 *    puede quedar `instalado` con la asignacion cerrada, y el filtro mira la asignacion, no el
 *    badge.
 *  - `soloActivos`: default **on**. ✅
 *
 * Lo que NO se cablea, y no es un olvido:
 *  - `conexion` ❌ — **el server NO declara el parametro** (D-S3-33): un query param que el binder
 *    no conoce se DESCARTA sin error, asi que mandarlo devuelve 200 con la lista ENTERA sin filtrar.
 *    No tiene fuente hasta slice-05 (B-9) y por eso tampoco se dibuja el chip.
 *  - busqueda libre: **no tiene param** en `GET /dispositivos`. El input no se pinta "por las
 *    dudas".
 */

export const PAGE_SIZE_DISPOSITIVOS_DEFAULT = 20
export const SORT_BY_DISPOSITIVOS_DEFAULT: DispositivoSortBy = 'FechaCreacion'
export const SORT_DIRECTION_DISPOSITIVOS_DEFAULT: SortDirection = 'Desc'

/** `''` = "Todos". No se manda al backend: ausente y "todos" son lo mismo. */
export type FiltroStock = EstadoStockDispositivo | ''

/** `''` = "Todos los modelos". El valor es el **uuid** de la fila del catalogo growable (B-18). */
export type FiltroModelo = string

/** `''` = "Asignados y sin asignar". */
export type FiltroAsignacion = FiltroAsignacionDispositivo | ''

export interface FlotaFiltrosDispositivos {
  stock: FiltroStock
  modelo: FiltroModelo
  asignacion: FiltroAsignacion
  soloActivos: boolean
  page: number
  pageSize: number
  sortBy: DispositivoSortBy
  sortDirection: SortDirection
}

export interface FlotaDispositivosFiltersState extends FlotaFiltrosDispositivos {
  setStock: (stock: FiltroStock) => void
  setModelo: (modelo: FiltroModelo) => void
  setAsignacion: (asignacion: FiltroAsignacion) => void
  setSoloActivos: (soloActivos: boolean) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setOrden: (sortBy: DispositivoSortBy, sortDirection: SortDirection) => void
  resetFiltros: () => void
}

const defaults: FlotaFiltrosDispositivos = {
  stock: '',
  modelo: '',
  asignacion: '',
  soloActivos: true,
  page: 1,
  pageSize: PAGE_SIZE_DISPOSITIVOS_DEFAULT,
  sortBy: SORT_BY_DISPOSITIVOS_DEFAULT,
  sortDirection: SORT_DIRECTION_DISPOSITIVOS_DEFAULT,
}

export const useFlotaDispositivosFiltersStore = create<FlotaDispositivosFiltersState>()(
  persist(
    (set) => ({
      ...defaults,

      // Cambiar un filtro vuelve a la pagina 1: sin esto, filtrar por stock estando en la pagina 5
      // devuelve una pagina vacia y parece que no hay resultados.
      //
      // ── LA COMBINACION IMPOSIBLE SE DESARMA SOLA ──────────────────────────────────────────────
      // La baja es COHERENTE (DA-DL-10): pone `activo=false` **y** `estado_stock='dado_de_baja'` en
      // la MISMA transaccion. O sea que `stock=dado_de_baja` + `soloActivos=true` es vacio
      // GARANTIZADO — y como `soloActivos` viene en `true` por default, elegir "Dado de baja" (una
      // de las 4 opciones legitimas del filtro, que `api.md` declara) devolvia siempre cero filas
      // con el cartel "ningun dispositivo coincide con tus filtros", sin decir cual de los dos
      // controles lo causaba.
      //
      // Se resuelve en el store y no en el componente porque es una regla del DATO, no del render:
      // los dos setters se cuidan mutuamente, asi el par nunca llega a existir. El control cambia a
      // la vista del usuario (el toggle se apaga solo), que es la parte honesta: no se filtra por
      // detras algo distinto de lo que la barra muestra.
      setStock: (stock) =>
        set(stock === 'dado_de_baja' ? { stock, soloActivos: false, page: 1 } : { stock, page: 1 }),
      setModelo: (modelo) => set({ modelo, page: 1 }),
      setAsignacion: (asignacion) => set({ asignacion, page: 1 }),
      setSoloActivos: (soloActivos) =>
        set((estado) =>
          soloActivos && estado.stock === 'dado_de_baja'
            ? { soloActivos, stock: '', page: 1 }
            : { soloActivos, page: 1 },
        ),
      setPage: (page) => set({ page }),
      setPageSize: (pageSize) => set({ pageSize, page: 1 }),
      setOrden: (sortBy, sortDirection) => set({ sortBy, sortDirection, page: 1 }),
      resetFiltros: () => set(defaults),
    }),
    {
      name: 'flota-dispositivos-filters',
      // `page` no se persiste: es posicion dentro de un resultado, no una preferencia.
      //
      // `modelo` TAMPOCO se persiste, y es deliberado: su valor es el uuid de una fila del catalogo
      // growable, que puede ser **de la organizacion**. Al cambiar de organizacion activa ese uuid
      // deja de existir y el listado arrancaria filtrado por algo invisible — con el chip mostrando
      // "Todos los modelos", porque el select no encuentra la opcion. Un filtro activo que no se ve
      // es la version silenciosa de "no hay datos".
      partialize: (state) => ({
        stock: state.stock,
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
 * Los filtros vacios se OMITEN del query en vez de viajar como `''`: el backend distingue "sin
 * filtro" de "filtro vacio", y un `stock=` vacio matchea contra ningun codigo del catalogo, o sea
 * devuelve una lista vacia en vez de la lista entera.
 */
export function aQueryDispositivos(filtros: FlotaFiltrosDispositivos): DispositivosPageQuery {
  return {
    page: filtros.page,
    pageSize: filtros.pageSize,
    sortBy: filtros.sortBy,
    sortDirection: filtros.sortDirection,
    soloActivos: filtros.soloActivos,
    ...(filtros.stock === '' ? {} : { stock: filtros.stock }),
    ...(filtros.modelo === '' ? {} : { modelo: filtros.modelo }),
    ...(filtros.asignacion === '' ? {} : { asignacion: filtros.asignacion }),
  }
}

/** ¿Hay algo que "Limpiar"? Decide cual de los dos vacios muestra la pantalla. */
export function hayFiltrosDispositivosActivos(filtros: FlotaFiltrosDispositivos): boolean {
  return (
    filtros.stock !== '' ||
    filtros.modelo !== '' ||
    filtros.asignacion !== '' ||
    filtros.soloActivos !== defaults.soloActivos
  )
}
