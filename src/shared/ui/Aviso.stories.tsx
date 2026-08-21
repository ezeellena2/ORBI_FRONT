import type { Meta, StoryObj } from '@storybook/react-vite'
import { Aviso } from './Aviso'
import { Boton } from './Boton'

const meta = {
  title: 'Primitivas/D Estado/Aviso',
  component: Aviso,
  args: { titulo: 'No pudimos guardar los cambios' },
} satisfies Meta<typeof Aviso>

export default meta
type Story = StoryObj<typeof meta>

/** Lo mínimo: un título ya resuelto por i18n. Es el caso más común dentro de un modal. */
export const SoloTitulo: Story = {}

/** Con detalle. El texto viene del `message_key` traducido, nunca hardcodeado en la pantalla. */
export const ConMensaje: Story = {
  args: {
    mensaje: 'La patente ya está registrada en otra organización.',
  },
}

/**
 * Con `trazaId`: el dato con el que soporte encuentra el request en los logs.
 *
 * Es la razón por la que esta superficie es PERSISTENTE y no un toast — en 4 segundos no se puede
 * copiar, y copiarlo es su única razón de existir (`04-patrones-de-pantalla.md` §4).
 */
export const ConTrazaId: Story = {
  args: {
    mensaje: 'El servicio no respondió a tiempo.',
    trazaId: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
  },
}

/**
 * Con acción. `Reintentar` solo va donde reintentar PUEDE funcionar (500, red): en un 409 vuelve a
 * chocar contra el mismo conflicto.
 */
export const ConAccion: Story = {
  args: {
    mensaje: 'La conexión se interrumpió antes de confirmar el guardado.',
    trazaId: '00-9c2e1f8a4b6d0e3f5a7c9b1d3e5f7a9c-1a2b3c4d5e6f7a8b-01',
    accion: (
      <Boton variante="secundaria" tamano="sm">
        Reintentar
      </Boton>
    ),
  },
}
