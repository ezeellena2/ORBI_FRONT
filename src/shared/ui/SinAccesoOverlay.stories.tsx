import type { Meta, StoryObj } from '@storybook/react-vite'
import { SinAccesoOverlay } from './SinAccesoOverlay'

/**
 * Falta de permiso = OVERLAY, nunca redirect. Un redirect silencioso hace que
 * el usuario crea que la pantalla no existe y termine pidiéndole a soporte una
 * función que sí está, solo que no la tiene habilitada.
 */
const meta = {
  title: 'Primitivas/D Estado/SinAccesoOverlay',
  component: SinAccesoOverlay,
  decorators: [
    (Story) => (
      <div className="relative h-96 w-full overflow-hidden rounded-lg border border-borde bg-superficie-1 p-6">
        <p className="text-sm text-fg-secundario">
          Contenido de la pantalla, visible por debajo del velo: la señal de "esto existe y no lo
          podés ver", no de "esto no existe".
        </p>
        <Story />
      </div>
    ),
  ],
  args: { permiso: 'flota.vehiculos.leer' },
} satisfies Meta<typeof SinAccesoOverlay>

export default meta
type Story = StoryObj<typeof meta>

export const SinPermiso: Story = {}
export const ConVolver: Story = { args: { onVolver: () => {} } }
