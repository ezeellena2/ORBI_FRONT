import type { Meta, StoryObj } from '@storybook/react-vite'
import { EstadoError } from './EstadoError'

const meta = {
  title: 'Primitivas/D Estado/EstadoError',
  component: EstadoError,
  args: { titulo: 'No pudimos cargar los vehículos' },
} satisfies Meta<typeof EstadoError>

export default meta
type Story = StoryObj<typeof meta>

export const Recuperable: Story = {
  args: {
    variante: 'recuperable',
    mensaje: 'La conexión se interrumpió. Podés reintentar sin perder los filtros.',
    onReintentar: () => {},
  },
}

/** Sin fuente upstream no hay nada que reintentar desde acá: se muestra la traza. */
export const Bloqueante: Story = {
  args: {
    variante: 'bloqueante',
    mensaje: 'El servicio de telemetría no está disponible.',
    trazaId: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
  },
}
