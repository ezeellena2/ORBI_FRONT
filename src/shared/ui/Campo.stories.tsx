import type { Meta, StoryObj } from '@storybook/react-vite'
import { Campo } from './Campo'
import { Input } from './Input'

/**
 * `Campo` es obligatorio alrededor de todo control de entrada: es quien conecta
 * `label` ↔ control ↔ ayuda ↔ error por `id` / `aria-describedby` /
 * `aria-invalid`. Cableado a mano, la mitad de las pantallas queda sin `for` y
 * el click en la etiqueta deja de enfocar el campo.
 */
const meta = {
  title: 'Primitivas/B Formulario/Campo',
  component: Campo,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    etiqueta: 'Patente',
    children: (control) => <Input {...control} mono placeholder="AB123CD" />,
  },
} satisfies Meta<typeof Campo>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}
export const Requerido: Story = { args: { requerido: true } }
export const ConAyuda: Story = { args: { ayuda: 'Formato Mercosur o formato viejo.' } }
export const ConError: Story = {
  args: { error: 'La patente ya está registrada en otra organización.' },
}
export const EnLinea: Story = { args: { variante: 'en-linea', etiqueta: 'Solo activos' } }
