import type { Meta, StoryObj } from '@storybook/react-vite'
import { Boton } from './Boton'
import { ContenedorToast, toast } from './Toast'

/**
 * El toast NO reemplaza al error de formulario: un campo inválido se marca EN
 * EL CAMPO. El toast es para lo que pasó fuera de la vista, porque un error que
 * se va solo no se puede corregir.
 *
 * La pausa al hover y el descarte ya vienen de `sonner`. Un mensaje de 4
 * segundos que no se puede retener es un mensaje que no se leyó.
 */
const meta = {
  title: 'Primitivas/D Estado/Toast',
  component: ContenedorToast,
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
        <ContenedorToast />
      </div>
    ),
  ],
} satisfies Meta<typeof ContenedorToast>

export default meta
type Story = StoryObj<typeof meta>

export const Exito: Story = {
  render: () => (
    <Boton onClick={() => toast.exito('Vehículo dado de alta', { mensaje: 'Patente AB123CD.' })}>
      Disparar éxito
    </Boton>
  ),
}

export const Error: Story = {
  render: () => (
    <Boton
      variante="peligro"
      onClick={() =>
        toast.error('No se pudo guardar', { mensaje: 'La patente ya existe en otra organización.' })
      }
    >
      Disparar error
    </Boton>
  ),
}

export const Advertencia: Story = {
  render: () => (
    <Boton
      variante="secundaria"
      onClick={() => toast.advertencia('Telemetría sin señal', { mensaje: 'Datos parciales.' })}
    >
      Disparar advertencia
    </Boton>
  ),
}

export const Info: Story = {
  render: () => (
    <Boton variante="fantasma" onClick={() => toast.info('Sincronizando catálogo…')}>
      Disparar info
    </Boton>
  ),
}

export const ConAccion: Story = {
  render: () => (
    <Boton
      variante="superficie"
      onClick={() =>
        toast.exito('Vehículo dado de baja', {
          accion: { etiqueta: 'Deshacer', onSelect: () => {} },
        })
      }
    >
      Disparar con acción
    </Boton>
  ),
}
