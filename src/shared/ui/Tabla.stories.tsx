import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FilterX, MoreVertical } from 'lucide-react'
import { Badge } from './Badge'
import { BotonIcono } from './BotonIcono'
import type { Columna } from './Columna'
import { EstadoError } from './EstadoError'
import { EstadoVacio } from './EstadoVacio'
import { Tabla } from './Tabla'

/**
 * La tabla NO pagina, NO ordena y NO filtra: avisa. Recibe filas ya resueltas y
 * emite eventos, porque el orden y la paginación son server-side — una tabla
 * que ordena en el cliente muestra un orden distinto al de la página siguiente.
 */
interface Fila {
  id: string
  patente: string
  alias: string
  estado: 'en_linea' | 'desconectado'
  km: number
}

const filas: Fila[] = [
  { id: '1', patente: 'AB123CD', alias: 'Camión 12', estado: 'en_linea', km: 128340 },
  { id: '2', patente: 'AC456EF', alias: 'Utilitario 3', estado: 'desconectado', km: 54120 },
  { id: '3', patente: 'AD789GH', alias: 'Camión 7', estado: 'en_linea', km: 210998 },
]

const columnas: Columna<Fila>[] = [
  { clave: 'patente', titulo: 'Patente', tipo: 'mono', ordenable: true, ancho: 140 },
  { clave: 'alias', titulo: 'Alias', ordenable: true },
  {
    clave: 'estado',
    titulo: 'Conexión',
    // NO ordenable a propósito: es un campo compuesto que llega de Telemetría y
    // el backend no puede ordenar por él. Marcarlo ordenable prometería algo
    // que no se puede cumplir.
    render: (fila) =>
      fila.estado === 'en_linea' ? (
        <Badge variante="exito" punto>
          En línea
        </Badge>
      ) : (
        <Badge variante="neutro" punto>
          Desconectado
        </Badge>
      ),
  },
  { clave: 'km', titulo: 'Km', tipo: 'numero', alineacion: 'derecha', ordenable: true, ancho: 120 },
  {
    clave: 'acciones',
    titulo: '',
    tipo: 'acciones',
    ancho: 60,
    render: () => (
      <BotonIcono icono={MoreVertical} etiqueta="Acciones" variante="fantasma" tamano="sm" />
    ),
  },
]

// `Tabla` es genérica: se instancia el tipo con la fila de ejemplo para que los
// `args` de cada story tipen contra `Columna<Fila>` y no contra `unknown`.
const meta: Meta<typeof Tabla<Fila>> = {
  title: 'Primitivas/C Datos/Tabla',
  component: Tabla,
  decorators: [
    (Story) => (
      <div className="w-[52rem]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Tabla<Fila>>

export const ConDatos: Story = {
  args: { columnas, filas, claveFila: (f) => f.id },
}

export const Densa: Story = {
  args: { columnas, filas, claveFila: (f) => f.id, densidad: 'densa' },
}

export const Cargando: Story = {
  args: { columnas, filas: [], claveFila: (f) => f.id, cargando: true },
}

export const Vacia: Story = {
  args: {
    columnas,
    filas: [],
    claveFila: (f) => f.id,
    vacio: (
      <EstadoVacio
        variante="sin-resultados"
        icono={FilterX}
        titulo="Ningún vehículo coincide con los filtros"
        descripcion="Probá quitando el filtro de conexión."
      />
    ),
  },
}

export const ConError: Story = {
  args: {
    columnas,
    filas: [],
    claveFila: (f) => f.id,
    error: <EstadoError titulo="No pudimos cargar los vehículos" onReintentar={() => {}} />,
  },
}

export const ColumnaOrdenada: Story = {
  args: {
    columnas,
    filas,
    claveFila: (f) => f.id,
    orden: { clave: 'patente', direccion: 'asc' },
    onOrden: () => {},
  },
}

/** Con selección parcial, "seleccionar todos" va en INDETERMINADO. Sin eso, miente. */
export const ConSeleccionParcial: Story = {
  render: () => {
    const [seleccion, setSeleccion] = useState<string[]>(['1'])
    return (
      <Tabla
        columnas={columnas}
        filas={filas}
        claveFila={(f) => f.id}
        seleccion={seleccion}
        onSeleccion={setSeleccion}
      />
    )
  },
}

/** El handle responde al puntero y también a ← → con el teclado. */
export const Redimensionable: Story = {
  args: { columnas, filas, claveFila: (f) => f.id, redimensionable: true },
}
