import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MapaORBI } from './MapaORBI'
import type { EntidadUbicada } from './geometria'

/**
 * `MapaORBI` con datos que **no son de Flota**, a propósito.
 *
 * Es la prueba de que la extracción quedó genérica: si estas historias solo se pudieran escribir con
 * vehículos, el componente no sería compartido — sería el mapa de Flota mudado de carpeta. Lo que se
 * dibuja acá son **reclamos municipales**, que es el segundo consumidor real que el contrato
 * anticipa (`07-capa-compartida.md` §4.3).
 *
 * El mapa no sabe qué es un reclamo: recibe entidades con posición, y la traducción de
 * `estado`/`realce` a clases entra como FUNCIÓN desde el módulo.
 */

/** Un reclamo municipal: entidad ubicada + lo que la pantalla necesita para etiquetarlo. */
interface ReclamoEnMapa extends EntidadUbicada {
  readonly numero: string
  readonly categoria: string
}

const RECLAMOS: readonly ReclamoEnMapa[] = [
  { id: 'r-1', lat: -31.898, lng: -61.855, estado: 'resuelto', realce: null, numero: '2026-0412', categoria: 'Alumbrado' },
  { id: 'r-2', lat: -31.902, lng: -61.848, estado: 'en_curso', realce: 'alta', numero: '2026-0418', categoria: 'Bache' },
  { id: 'r-3', lat: -31.894, lng: -61.861, estado: 'recibido', realce: null, numero: '2026-0421', categoria: 'Arbolado' },
  { id: 'r-4', lat: -31.907, lng: -61.859, estado: 'recibido', realce: 'media', numero: '2026-0425', categoria: 'Residuos' },
  { id: 'r-5', lat: -31.899, lng: -61.842, estado: 'en_curso', realce: null, numero: '2026-0430', categoria: 'Semáforo' },
]

/** El vocabulario del módulo: estado del reclamo → clase de relleno. El mapa no conoce estos códigos. */
function claseDeEstadoDeReclamo(reclamo: ReclamoEnMapa): string {
  if (reclamo.estado === 'resuelto') return 'marcador--exito'
  if (reclamo.estado === 'en_curso') return 'marcador--advertencia'
  return 'marcador--neutro'
}

/** Prioridad → anillo. `null` = sin anillo, que NO significa "sin prioridad": significa "normal". */
function claseDePrioridad(reclamo: ReclamoEnMapa): string | null {
  if (reclamo.realce === 'alta') return 'marcador--senal-peligro'
  if (reclamo.realce === 'media') return 'marcador--senal-advertencia'
  return null
}

/** Leaflet necesita un contenedor con alto real: sin esto el mapa mide 0 y no dibuja un solo tile. */
function Lienzo({ children }: { children: React.ReactNode }) {
  return <div className="relative h-[520px] w-full">{children}</div>
}

const meta = {
  title: 'Patrones/Mapa/MapaORBI',
  component: MapaORBI,
  parameters: { layout: 'fullscreen' },
  args: {
    items: RECLAMOS,
    seleccionadoId: null,
    onSeleccionar: () => {},
    etiquetaDe: (reclamo: ReclamoEnMapa) => `${reclamo.categoria} · ${reclamo.numero}`,
    claseDeEstado: claseDeEstadoDeReclamo,
    claseDeRealce: claseDePrioridad,
  },
  render: (args) => (
    <Lienzo>
      <MapaORBI<ReclamoEnMapa> {...args} />
    </Lienzo>
  ),
} satisfies Meta<typeof MapaORBI<ReclamoEnMapa>>

export default meta
type Story = StoryObj<typeof meta>

/** Reclamos de un municipio, sin selección. El encuadre automático los mete a todos en cuadro. */
export const ReclamosMunicipales: Story = {}

/** Con uno seleccionado: se dibuja por encima y el mapa se acerca a él. */
export const ConSeleccion: Story = {
  render: function ConSeleccionRender(args) {
    const [seleccionadoId, setSeleccionadoId] = useState<string | null>('r-2')

    return (
      <Lienzo>
        <MapaORBI<ReclamoEnMapa>
          {...args}
          seleccionadoId={seleccionadoId}
          onSeleccionar={setSeleccionadoId}
        />
      </Lienzo>
    )
  },
}

/**
 * Con los slots puestos — la composición que el contrato §4.2 propone y que Flota **no** usa (ahí el
 * panel es un hermano flex). Sirve para probar que los slots montan sobre el lienzo sin competir con
 * los panes de Leaflet.
 */
export const ConSlots: Story = {
  args: {
    seleccionadoId: 'r-4',
    slotLeyenda: (
      <div className="pointer-events-none absolute bottom-3 left-3 z-(--z-dropdown) flex flex-col gap-1 rounded-md border border-borde bg-superficie-1/95 px-3 py-2 shadow-sm">
        <span className="text-xs text-fg-secundario">Resuelto · En curso · Recibido</span>
      </div>
    ),
  },
}

/** Sin entidades: el mapa se monta igual y queda en la vista por defecto. No se desmonta nunca. */
export const SinEntidades: Story = {
  args: { items: [] },
}
