import type { Meta, StoryObj } from '@storybook/react-vite'
import { Wifi } from 'lucide-react'
import { Badge } from './Badge'

/**
 * `Badge` es TONTO: recibe `variante` y texto. El mapeo
 * `código de catálogo → variante + label` (`en_linea` → verde "En línea") vive
 * en la capa 2, en el módulo, con sus tests de mapeo — si el badge conociera
 * los códigos habría que tocarlo cada vez que un módulo agrega un estado.
 *
 * Y el color nunca es el único portador de significado: siempre hay texto, más
 * `punto` o `icono` si hace falta. Daltonismo, y una captura en blanco y negro
 * sigue siendo legible.
 */
const meta = {
  title: 'Primitivas/F Identidad/Badge',
  component: Badge,
  args: { children: 'Etiqueta' },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Neutro: Story = { args: { variante: 'neutro' } }
export const Acento: Story = { args: { variante: 'acento' } }
export const Accion: Story = { args: { variante: 'accion' } }
export const Exito: Story = { args: { variante: 'exito', children: 'En línea' } }
export const Advertencia: Story = { args: { variante: 'advertencia', children: 'Incompleto' } }
export const Peligro: Story = { args: { variante: 'peligro', children: 'Dado de baja' } }
export const Info: Story = { args: { variante: 'info', children: 'Sin dato' } }

export const ConPunto: Story = { args: { variante: 'exito', punto: true, children: 'En línea' } }
export const ConIcono: Story = {
  args: { variante: 'acento', icono: Wifi, children: 'Transmitiendo' },
}
