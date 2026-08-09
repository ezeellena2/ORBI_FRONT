import type { Meta, StoryObj } from '@storybook/react-vite'
import { MoreVertical } from 'lucide-react'
import { BotonIcono } from './BotonIcono'
import { Card } from './Card'

const meta = {
  title: 'Primitivas/E Superficie/Card',
  component: Card,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    titulo: 'Camión 12',
    children: 'Última señal hace 4 minutos · 320 km hoy',
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Plana: Story = { args: { variante: 'plana' } }
/** Si se puede clickear, se tiene que poder tabular: lleva `tabIndex` y `role`. */
export const Interactiva: Story = { args: { variante: 'interactiva' } }
export const Seleccionada: Story = { args: { variante: 'seleccionada' } }
/** El resplandor de marca: la firma visual de "esto está vivo". */
export const Glow: Story = { args: { variante: 'glow' } }
export const ConAcciones: Story = {
  args: {
    acciones: <BotonIcono icono={MoreVertical} etiqueta="Acciones" variante="fantasma" tamano="sm" />,
  },
}
