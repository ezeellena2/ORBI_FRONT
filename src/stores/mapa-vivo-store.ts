import { create } from 'zustand'
import type { EstadoConexion } from '@/services/contracts/flota'

/**
 * Estado de UI del MAPA EN VIVO (`frontend.md` §5).
 *
 * **No persiste** —a diferencia de `flota-filters-store`, que si guarda los filtros de los listados
 * en `localStorage`—. Un mapa es una superficie de "que esta pasando ahora": volver mañana con el
 * vehiculo de ayer seleccionado y el filtro "Desconectado" puesto es peor que empezar limpio.
 *
 * ── POR QUE UN STORE Y NO `useState` DE LA PAGINA ─────────────────────────────────────────────
 * La seleccion la escriben DOS superficies que no se conocen entre si —el chip del panel izquierdo y
 * el marcador de Leaflet, que vive dentro del arbol de `MapContainer`— y la leen otras dos (el panel
 * derecho y el componente que centra el mapa). `frontend.md` §5 ya lo declara como
 * `stores/mapa-vivo-store.ts`; se respeta la spec en vez de reinventar el reparto.
 *
 * ⚠️ **Lectura SELECTIVA siempre**: `useMapaVivoStore((s) => s.vehiculoSeleccionadoId)`. Un selector
 * que devuelva un objeto nuevo (`(s) => ({ a: s.a })`) dispara un bucle de re-render en zustand 5,
 * que compara por identidad. Este store no expone ningun campo compuesto justamente para que no haya
 * forma de escribir ese selector.
 *
 * ── LO QUE `frontend.md` §5 LISTA Y ESTE STORE NO TIENE ────────────────────────────────────────
 *  - **`capasActivas`**: no hay capas que alternar. Geocercas esta **DIFERIDO (DA-08)** y
 *    Trafico/POIs/Talleres/Estaciones no tienen fuente declarada en ningun contrato (**DA-MV-03**).
 *    Queda una sola capa —los vehiculos—, y un toggle cuya unica posicion util es "encendido" es un
 *    control que solo sirve para vaciar el mapa.
 *  - **`siguiendoVehiculo`**: "Seguir" es **DA-MV-09**, abierta. En el mockup es un `simToast`.
 *  Las dos se agregan el dia que su decision cierre; el store crece, la pantalla no se rehace.
 */

export type PestanaDetalleMapa = 'actual' | 'recorrido'

interface MapaVivoState {
  /** `vehiculoFlotaId` (id LOCAL, A-4) del marcador seleccionado. `null` = panel derecho cerrado. */
  vehiculoSeleccionadoId: string | null
  pestanaActiva: PestanaDetalleMapa
  /** Panel izquierdo plegado: el mapa se queda con ese ancho (y hay que avisarle a Leaflet). */
  panelLateralColapsado: boolean
  /** Texto del buscador del panel. Filtra CLIENT-SIDE: el endpoint no acepta parametros (P6). */
  busqueda: string
  /** Filtro de estado de conexion. `''` = sin filtro. Tambien client-side. */
  estado: EstadoConexion | ''

  seleccionarVehiculo: (vehiculoFlotaId: string | null) => void
  setPestana: (pestana: PestanaDetalleMapa) => void
  alternarPanelLateral: () => void
  setBusqueda: (busqueda: string) => void
  setEstado: (estado: EstadoConexion | '') => void
  limpiarFiltros: () => void
}

export const useMapaVivoStore = create<MapaVivoState>()((set) => ({
  vehiculoSeleccionadoId: null,
  pestanaActiva: 'actual',
  panelLateralColapsado: false,
  busqueda: '',
  estado: '',

  /**
   * Seleccionar SIEMPRE vuelve a la pestaña "Actual".
   *
   * Sin esto, quien deja abierta la pestaña "Recorrido" —que es la que declara no tener fuente
   * (**B-9**)— y toca otro marcador, ve el cartel de "no disponible" en vez del vehiculo que acaba
   * de elegir, y concluye que el mapa esta roto.
   */
  seleccionarVehiculo: (vehiculoFlotaId) =>
    set({ vehiculoSeleccionadoId: vehiculoFlotaId, pestanaActiva: 'actual' }),

  setPestana: (pestanaActiva) => set({ pestanaActiva }),

  alternarPanelLateral: () =>
    set((estado) => ({ panelLateralColapsado: !estado.panelLateralColapsado })),

  setBusqueda: (busqueda) => set({ busqueda }),
  setEstado: (estado) => set({ estado }),
  limpiarFiltros: () => set({ busqueda: '', estado: '' }),
}))
