import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  DispositivoSortBy,
  DispositivosPageQuery,
  EstadoConexion,
  EstadoStockDispositivo,
  FiltroAsignacionDispositivo,
  SortDirection,
} from '@/services/contracts/flota'

/**
 * Filtros del listado de dispositivos GPS — `frontend.md` §5, mismo patron que
 * `flota-filters-store` (vehiculos). Store separado a proposito: son dos listados distintos y
 * compartir `page`/`pageSize` entre ellos haria que paginar dispositivos moviera vehiculos.
 *
 * CABLEADO HOY — los **5** filtros que el server DECLARA (`api.md`, tabla de D-S3-33 + slice-05):
 *  - `stock`: los 4 codigos del catalogo `estados_stock_dispositivo_flota`. ✅
 *  - `modelo`: el **uuid** de la fila del catalogo growable, NUNCA el nombre (B-18). ✅
 *  - `asignacion`: `asignado` | `sin_asignar`. ✅ desde **D-S3-33** — es un `EXISTS` sobre la
 *    asignacion con periodo abierto y **NO es equivalente a `stock=instalado`**: un dispositivo
 *    puede quedar `instalado` con la asignacion cerrada, y el filtro mira la asignacion, no el
 *    badge.
 *  - `conexion`: ✅ desde **slice-05 `f-03`** (2026-08-12). El comentario que decia "el server NO
 *    declara el parametro" quedo viejo: `DispositivosPageQuery` lo declara y filtra ANTES de
 *    paginar, compuesto desde la misma llamada a Telemetria que trae `ultimaSenal`.
 *  - `soloActivos`: default **on**. ✅
 *
 * ⚠️ `conexion` es ORTOGONAL a `asignacion` y a `stock`, y los tres se combinan. Un GPS `en_stock`
 * tambien recibe badge de conexion, y ese badge es `sin_dato` **por ausencia** (nunca aparecio en la
 * fuente batch), no porque este apagado.
 *
 * Lo que NO se cablea, y no es un olvido:
 *  - `conexion = 'incompleto'` ⚠️ — el valor esta en el vocabulario y es **INALCANZABLE** para un
 *    dispositivo (B-32): significa "vehiculo sin dispositivo", y "dispositivo sin vehiculo" se mudo
 *    al filtro `asignacion`. El server lo acepta y devuelve lista vacia. El chip ofrece los otros 3
 *    (`VALORES_FILTRO_CONEXION` de `modules/flota/vocabulario-conexion.ts`, el unico lugar donde
 *    vive esa lista).
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

/** `''` = "Cualquier estado de conexion". No se manda: ausente y "todos" son lo mismo. */
export type FiltroConexionDispositivo = EstadoConexion | ''

export interface FlotaFiltrosDispositivos {
  stock: FiltroStock
  modelo: FiltroModelo
  asignacion: FiltroAsignacion
  conexion: FiltroConexionDispositivo
  soloActivos: boolean
  page: number
  pageSize: number
  sortBy: DispositivoSortBy
  sortDirection: SortDirection
}

/**
 * Entrada de `aQueryDispositivos` / `hayFiltrosDispositivosActivos`.
 *
 * `conexion` es OPCIONAL acá y requerido en el store **a proposito**: la pantalla que todavia no lo
 * lee sigue compilando y sigue mandando exactamente lo mismo que antes (omitir = no mandar el param
 * = sin filtro). Cuando la pantalla lo cablee, viaja.
 */
export type EntradaQueryDispositivos = Omit<FlotaFiltrosDispositivos, 'conexion'> &
  Partial<Pick<FlotaFiltrosDispositivos, 'conexion'>>

export interface FlotaDispositivosFiltersState extends FlotaFiltrosDispositivos {
  setStock: (stock: FiltroStock) => void
  setModelo: (modelo: FiltroModelo) => void
  setAsignacion: (asignacion: FiltroAsignacion) => void
  setConexion: (conexion: FiltroConexionDispositivo) => void
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
  conexion: '',
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
      setConexion: (conexion) => set({ conexion, page: 1 }),
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
      //
      // `conexion` SI se persiste: se ve en su chip, asi que un filtro activo al volver no queda
      // invisible. Lo que la pantalla tiene que contar —y no ocultar— es que con Telemetria caida
      // TODO vale `sin_dato` y `conexion=en_linea` devuelve lista vacia (ver
      // `claveDeVacioPorFiltroDeConexion` en `modules/flota/vocabulario-conexion.ts`).
      partialize: (state) => ({
        stock: state.stock,
        asignacion: state.asignacion,
        conexion: state.conexion,
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
export function aQueryDispositivos(filtros: EntradaQueryDispositivos): DispositivosPageQuery {
  return {
    page: filtros.page,
    pageSize: filtros.pageSize,
    sortBy: filtros.sortBy,
    sortDirection: filtros.sortDirection,
    soloActivos: filtros.soloActivos,
    ...(filtros.stock === '' ? {} : { stock: filtros.stock }),
    ...(filtros.modelo === '' ? {} : { modelo: filtros.modelo }),
    ...(filtros.asignacion === '' ? {} : { asignacion: filtros.asignacion }),
    ...(filtros.conexion === '' || filtros.conexion === undefined
      ? {}
      : { conexion: filtros.conexion }),
  }
}

/** ¿Hay algo que "Limpiar"? Decide cual de los dos vacios muestra la pantalla. */
export function hayFiltrosDispositivosActivos(filtros: EntradaQueryDispositivos): boolean {
  return (
    filtros.stock !== '' ||
    filtros.modelo !== '' ||
    filtros.asignacion !== '' ||
    (filtros.conexion ?? '') !== '' ||
    filtros.soloActivos !== defaults.soloActivos
  )
}
