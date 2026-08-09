import type { Meta, StoryObj } from '@storybook/react-vite'
import { Select } from './Select'

/**
 * Las opciones de este Select llegan de un ENDPOINT DE CATÁLOGO, nunca
 * hardcodeadas: los estados, tipos y marcas viven en tablas de la base. Por eso
 * `cargando` y `sin-opciones` son estados de primera y tienen su story.
 */
const meta = {
  title: 'Primitivas/B Formulario/Select',
  component: Select,
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
  args: {
    placeholder: 'Elegí un estado',
    opciones: [
      { valor: 'en_stock', etiqueta: 'En stock' },
      { valor: 'instalado', etiqueta: 'Instalado' },
      { valor: 'en_reparacion', etiqueta: 'En reparación' },
      { valor: 'dado_de_baja', etiqueta: 'Dado de baja' },
    ],
  },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Reposo: Story = {}
export const ConValor: Story = { args: { valor: 'instalado' } }
export const Cargando: Story = { args: { cargando: true } }
export const SinOpciones: Story = { args: { opciones: [] } }
export const ConOpcionDeshabilitada: Story = {
  args: {
    opciones: [
      { valor: 'en_stock', etiqueta: 'En stock' },
      { valor: 'dado_de_baja', etiqueta: 'Dado de baja', deshabilitada: true },
    ],
  },
}
export const Invalido: Story = { args: { invalido: true } }
export const Deshabilitado: Story = { args: { deshabilitado: true } }
