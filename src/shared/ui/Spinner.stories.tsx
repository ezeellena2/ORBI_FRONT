import type { Meta, StoryObj } from '@storybook/react-vite'
import { Spinner } from './Spinner'

const meta = {
  title: 'Primitivas/D Estado/Spinner',
  component: Spinner,
  args: { etiqueta: 'Cargando vehículos' },
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

export const Chico: Story = { args: { tamano: 'sm' } }
export const Medio: Story = { args: { tamano: 'md' } }
export const Grande: Story = { args: { tamano: 'lg' } }
