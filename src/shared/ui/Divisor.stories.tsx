import type { Meta, StoryObj } from '@storybook/react-vite'
import { Divisor } from './Divisor'

const meta = {
  title: 'Primitivas/E Superficie/Divisor',
  component: Divisor,
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Divisor>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = { args: { orientation: 'horizontal' } }
export const Vertical: Story = {
  render: () => (
    <div className="flex h-16 items-center gap-4">
      <span className="text-sm text-fg-secundario">Izquierda</span>
      <Divisor orientation="vertical" />
      <span className="text-sm text-fg-secundario">Derecha</span>
    </div>
  ),
}
export const ConEtiqueta: Story = { args: { etiqueta: 'Datos del dispositivo' } }
