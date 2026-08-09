import type { Meta, StoryObj } from '@storybook/react-vite'
import { AreaTexto } from './AreaTexto'

const meta = {
  title: 'Primitivas/B Formulario/AreaTexto',
  component: AreaTexto,
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: { placeholder: 'Observaciones del vehículo…' },
} satisfies Meta<typeof AreaTexto>

export default meta
type Story = StoryObj<typeof meta>

export const Reposo: Story = {}
export const ConValor: Story = { args: { defaultValue: 'Cambió cubiertas el 12/03.' } }
export const ConContador: Story = { args: { maxLargo: 120, contador: true } }
/** Al llegar al límite el contador cambia de color y se anuncia por `aria-live`. */
export const EnElLimite: Story = {
  args: { maxLargo: 20, contador: true, defaultValue: 'Veinte caracteres!!!' },
}
export const Invalido: Story = { args: { invalido: true, defaultValue: 'Texto inválido' } }
export const Deshabilitado: Story = { args: { disabled: true, defaultValue: 'No editable' } }
