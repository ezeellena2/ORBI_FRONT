import type { Meta, StoryObj } from '@storybook/react-vite'
import { Building2 } from 'lucide-react'
import { Avatar } from './Avatar'

const meta = {
  title: 'Primitivas/F Identidad/Avatar',
  component: Avatar,
  args: { nombre: 'Ezequiel Ellena' },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Iniciales: Story = {}
export const ConImagen: Story = {
  args: { src: 'https://i.pravatar.cc/80?img=12', soloAvatar: true },
}
export const ConIcono: Story = { args: { icono: Building2, nombre: 'Transportes del Sur' } }
export const ConIndicadorEnLinea: Story = { args: { estado: 'en-linea' } }
export const ConIndicadorInactivo: Story = { args: { estado: 'inactivo' } }
export const ConIndicadorAlerta: Story = { args: { estado: 'alerta' } }

export const Tamanos: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar nombre="Ana Ruiz" tamano="sm" />
      <Avatar nombre="Ana Ruiz" tamano="md" />
      <Avatar nombre="Ana Ruiz" tamano="lg" />
      <Avatar nombre="Ana Ruiz" tamano="xl" />
    </div>
  ),
}
