import type { Meta, StoryObj } from '@storybook/react-vite'
import { FilterX, Truck } from 'lucide-react'
import { Boton } from './Boton'
import { EstadoVacio } from './EstadoVacio'

/**
 * `sin-datos` ≠ `sin-resultados`, y ofrecer el CTA equivocado deja al usuario
 * trabado: el botón "Crear vehículo" no le sirve a alguien que tiene 400 y un
 * filtro mal puesto.
 */
const meta = {
  title: 'Primitivas/D Estado/EstadoVacio',
  component: EstadoVacio,
} satisfies Meta<typeof EstadoVacio>

export default meta
type Story = StoryObj<typeof meta>

export const SinDatos: Story = {
  args: {
    variante: 'sin-datos',
    icono: Truck,
    titulo: 'Todavía no cargaste vehículos',
    descripcion: 'Cuando des de alta el primero vas a verlo acá con su estado en vivo.',
    acciones: <Boton>Cargar vehículo</Boton>,
  },
}

export const SinResultados: Story = {
  args: {
    variante: 'sin-resultados',
    icono: FilterX,
    titulo: 'Ningún vehículo coincide con los filtros',
    descripcion: 'Probá quitando el filtro de estado o ampliando el rango de fechas.',
    acciones: <Boton variante="secundaria">Limpiar filtros</Boton>,
  },
}
