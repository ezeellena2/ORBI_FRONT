import type { Meta, StoryObj } from '@storybook/react-vite'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { BotonIcono } from './BotonIcono'

/**
 * `etiqueta` es obligatoria POR TIPO. Un botón sin texto visible no tiene
 * nombre accesible, y sin nombre accesible es invisible para un lector de
 * pantalla y para el test.
 */
const meta = {
  title: 'Primitivas/A Accion/BotonIcono',
  component: BotonIcono,
  args: { icono: Pencil, etiqueta: 'Editar' },
} satisfies Meta<typeof BotonIcono>

export default meta
type Story = StoryObj<typeof meta>

export const Reposo: Story = {}
export const Deshabilitado: Story = { args: { deshabilitado: true } }
export const Cargando: Story = { args: { cargando: true } }
export const Peligro: Story = {
  args: { variante: 'peligro-contorno', icono: Trash2, etiqueta: 'Dar de baja' },
}
export const Circular: Story = { args: { circular: true, variante: 'superficie' } }
export const KebabDeFila: Story = {
  args: { icono: MoreVertical, etiqueta: 'Acciones de la fila', variante: 'fantasma', tamano: 'sm' },
}
