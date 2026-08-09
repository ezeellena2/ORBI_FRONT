import type { Meta, StoryObj } from '@storybook/react-vite'
import { EtiquetaOrden } from './EtiquetaOrden'

/**
 * Lo que la hace algo más que una flechita es `aria-sort`, que `Tabla` pone en
 * el `<th>` a partir del mismo estado: es lo único que le dice a un lector de
 * pantalla por qué columna está ordenada la tabla.
 */
const meta = {
  title: 'Primitivas/C Datos/EtiquetaOrden',
  component: EtiquetaOrden,
} satisfies Meta<typeof EtiquetaOrden>

export default meta
type Story = StoryObj<typeof meta>

export const SinOrden: Story = { args: { estado: 'sin-orden' } }
export const Ascendente: Story = { args: { estado: 'asc' } }
export const Descendente: Story = { args: { estado: 'desc' } }
