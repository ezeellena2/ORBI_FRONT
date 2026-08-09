import type { Meta, StoryObj } from '@storybook/react-vite'
import { Toggle } from './Toggle'

/**
 * `cargando` no es decorativo: los toggles persisten al instante y sin estado
 * intermedio el usuario lo mueve dos veces, mandando dos escrituras
 * contradictorias cuya ganadora depende del orden de llegada al servidor.
 */
const meta = {
  title: 'Primitivas/B Formulario/Toggle',
  component: Toggle,
  args: { etiqueta: 'Notificar alertas críticas' },
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

export const Apagado: Story = { args: { activo: false } }
export const Encendido: Story = { args: { activo: true } }
export const Cargando: Story = { args: { activo: true, cargando: true } }
export const Deshabilitado: Story = { args: { activo: false, deshabilitado: true } }
export const ConDescripcion: Story = {
  args: { activo: true, descripcion: 'Se envían por email y por la campanita.' },
}
