import type { Meta, StoryObj } from '@storybook/react-vite'
import { GrupoRadio } from './GrupoRadio'

const meta = {
  title: 'Primitivas/B Formulario/GrupoRadio',
  component: GrupoRadio,
  args: {
    opciones: [
      { valor: 'nuevo', etiqueta: 'Dispositivo nuevo', descripcion: 'Todavía sin instalar' },
      { valor: 'existente', etiqueta: 'Dispositivo del stock' },
      { valor: 'sin', etiqueta: 'Sin dispositivo por ahora' },
    ],
  },
} satisfies Meta<typeof GrupoRadio>

export default meta
type Story = StoryObj<typeof meta>

export const SinMarcar: Story = {}
export const Marcado: Story = { args: { valor: 'existente' } }
export const Horizontal: Story = { args: { orientacion: 'horizontal', valor: 'nuevo' } }
export const ConOpcionDeshabilitada: Story = {
  args: {
    valor: 'nuevo',
    opciones: [
      { valor: 'nuevo', etiqueta: 'Dispositivo nuevo' },
      { valor: 'existente', etiqueta: 'Dispositivo del stock', deshabilitada: true },
    ],
  },
}
