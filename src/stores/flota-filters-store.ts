import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  EstadoConexion,
  SituacionVehiculo,
  SortDirection,
  VehiculoSortBy,
  VehiculosPageQuery,
} from '@/services/contracts/flota'

/**
 * Filtros del listado de vehiculos — `frontend.md` §5.
 *
 * CABLEADO HOY — los filtros que el server DECLARA (tabla de estado de `api.md` §Vehiculos):
 *  - `patente`: busqueda parcial, case-insensitive. ✅
 *  - `soloActivos`: default **on**. ✅
 *  - `situacion`: los 4 valores. ✅ desde **slice-05 `f-02`** — son `EXISTS` INTRA-SCHEMA, asi que
 *    no dependen de Telemetria y no se caen con ella.
 *  - `estado` (CONEXION): ✅ desde **slice-05 `f-03`**, compuesto desde Telemetria. El server trae
 *    candidatos, compone, filtra y recien ahi pagina, asi que `totalItems` no miente.
 *
 * Lo que NO se cablea, y no es un olvido:
 *  - `tipo` ❌ — el server SI lo declara, pero su unica fuente de opciones
 *    (`GET /api/flota/catalogos/tipos-vehiculo`) **no existe en `Flota.Api`** y el catalogo canonico
 *    esta vacio (DA-CAT-02). Un select sin opciones no es un filtro. Lo cablea quien resuelva la
 *    fuente, no este store.
 *  - `estado = 'incompleto'` ⚠️ — el valor existe en el vocabulario y **matchea 0 filas** (B-31).
 *    El chip ofrece los otros 3: `VALORES_FILTRO_CONEXION` de
 *    `modules/flota/vocabulario-conexion.ts` es el unico lugar donde vive esa lista.
 *  - busqueda multi-campo: el contrato define busqueda parcial **solo por `patente`**.
 *
 * Vive en `stores/` y no en `modules/flota/state/` por decision B-20.
 */

export const PAGE_SIZE_DEFAULT = 20
export const SORT_BY_DEFAULT: VehiculoSortBy = 'FechaCreacion'
export const SORT_DIRECTION_DEFAULT: SortDirection = 'Desc'

/** `''` = "Cualquier estado de conexion". No se manda: ausente y "todos" son lo mismo. */
export type FiltroConexion = EstadoConexion | ''

/** `''` = "Toda la flota". */
export type FiltroSituacion = SituacionVehiculo | ''

export interface FlotaFiltrosVehiculos {
  patente: string
  estado: FiltroConexion
  situacion: FiltroSituacion
  soloActivos: boolean
  page: number
  pageSize: number
  sortBy: VehiculoSortBy
  sortDirection: SortDirection
}

/**
 * Entrada de `aQueryVehiculos` / `hayFiltrosVehiculosActivos`.
 *
 * Los 2 filtros que slice-05 agrega son OPCIONALES acá y requeridos en el store **a proposito**: la
 * pantalla que todavia no los lee sigue compilando y sigue mandando exactamente lo mismo que antes
 * (omitir = no mandar el param = sin filtro). Cuando la pantalla los cablee, viajan. Sin esto, el
 * store y la pagina tendrian que cambiar en el mismo commit o el build queda roto en el medio.
 */
export type EntradaQueryVehiculos = Omit<FlotaFiltrosVehiculos, 'estado' | 'situacion'> &
  Partial<Pick<FlotaFiltrosVehiculos, 'estado' | 'situacion'>>

export interface FlotaFiltersState extends FlotaFiltrosVehiculos {
  setPatente: (patente: string) => void
  setEstado: (estado: FiltroConexion) => void
  setSituacion: (situacion: FiltroSituacion) => void
  setSoloActivos: (soloActivos: boolean) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setOrden: (sortBy: VehiculoSortBy, sortDirection: SortDirection) => void
  resetFiltros: () => void
}

const defaults: FlotaFiltrosVehiculos = {
  patente: '',
  estado: '',
  situacion: '',
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
      setEstado: (estado) => set({ estado, page: 1 }),
      setSituacion: (situacion) => set({ situacion, page: 1 }),
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
      //
      // `estado` y `situacion` SI se persisten: los 2 se ven en su chip, asi que un filtro activo
      // al volver no es invisible (que es el motivo por el que `modelo` no se persiste en el store
      // de dispositivos). Con `estado` hay un caso que la pantalla tiene que contar y no ocultar:
      // si Telemetria no responde, TODO vale `sin_dato` y `estado=en_linea` devuelve lista vacia —
      // para eso esta `claveDeVacioPorFiltroDeConexion` en `vocabulario-conexion.ts`.
      partialize: (state) => ({
        patente: state.patente,
        estado: state.estado,
        situacion: state.situacion,
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
 * Los filtros vacios se OMITEN en vez de viajar como `''`: el backend distingue "sin filtro" de
 * "filtro vacio", y un `estado=` vacio no matchea contra ningun codigo del vocabulario — o sea que
 * devolveria lista vacia en vez de la lista entera.
 */
export function aQueryVehiculos(filtros: EntradaQueryVehiculos): VehiculosPageQuery {
  const patente = filtros.patente.trim()

  return {
    page: filtros.page,
    pageSize: filtros.pageSize,
    sortBy: filtros.sortBy,
    sortDirection: filtros.sortDirection,
    soloActivos: filtros.soloActivos,
    ...(patente.length > 0 ? { patente } : {}),
    ...(filtros.estado === '' || filtros.estado === undefined ? {} : { estado: filtros.estado }),
    ...(filtros.situacion === '' || filtros.situacion === undefined
      ? {}
      : { situacion: filtros.situacion }),
  }
}

/**
 * ¿Hay algo que "Limpiar"? Es lo que decide cual de los DOS vacios muestra la pantalla: "todavia no
 * cargaste vehiculos" (sin datos) o "ninguno coincide con tus filtros" (sin resultados). Mostrar el
 * primero teniendo flota, solo porque un filtro la recorto, es la version silenciosa de perder los
 * datos.
 */
export function hayFiltrosVehiculosActivos(filtros: EntradaQueryVehiculos): boolean {
  return (
    filtros.patente.trim() !== '' ||
    (filtros.estado ?? '') !== '' ||
    (filtros.situacion ?? '') !== '' ||
    filtros.soloActivos !== defaults.soloActivos
  )
}
