import type { Meta, StoryObj } from '@storybook/react-vite'
import { Enlace } from './Enlace'

const meta = {
  title: 'Primitivas/A Accion/Enlace',
  component: Enlace,
  args: { href: '#', children: 'Ver detalle del vehículo' },
} satisfies Meta<typeof Enlace>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = { args: { variante: 'normal' } }
export const Sutil: Story = { args: { variante: 'sutil' } }
export const Externo: Story = {
  args: { externo: true, href: 'https://example.org', children: 'Documentación del dispositivo' },
}
