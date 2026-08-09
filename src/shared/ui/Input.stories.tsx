import type { Meta, StoryObj } from '@storybook/react-vite'
import { Search, X } from 'lucide-react'
import { Input } from './Input'

const meta = {
  title: 'Primitivas/B Formulario/Input',
  component: Input,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: { placeholder: 'Escribí algo…' },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Reposo: Story = {}
export const ConValor: Story = { args: { defaultValue: 'Camión 12' } }
export const Invalido: Story = { args: { invalido: true, defaultValue: 'AB12' } }
export const Deshabilitado: Story = { args: { disabled: true, defaultValue: 'No editable' } }
export const SoloLectura: Story = { args: { readOnly: true, defaultValue: 'Solo lectura' } }

/** Patentes, VIN, IMEI y coordenadas: se comparan carácter por carácter. */
export const Mono: Story = { args: { mono: true, defaultValue: '8AGXXXXXXXXXXXXXX' } }

export const ConIconoIzquierda: Story = {
  args: { iconoIzq: Search, placeholder: 'Buscar por patente o alias' },
}
export const ConIconoDerecha: Story = { args: { iconoDer: X, defaultValue: 'Camión 12' } }
