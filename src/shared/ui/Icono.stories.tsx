import type { Meta, StoryObj } from '@storybook/react-vite'
import { Truck } from 'lucide-react'
import { Icono } from './Icono'

/**
 * `Icono` hereda el color por `currentColor` y NUNCA lo fija: un ícono adentro
 * de un botón `peligro` se pinta solo, sin una variante de ícono por cada
 * variante de botón.
 *
 * PENDIENTE (DA-FE-04 de `02-primitivas.md`): librería, empaquetado y grilla de
 * tamaños. La grilla de abajo es provisoria.
 */
const meta = {
  title: 'Primitivas/F Identidad/Icono',
  component: Icono,
  args: { icono: Truck },
} satisfies Meta<typeof Icono>

export default meta
type Story = StoryObj<typeof meta>

export const Decorativo: Story = { args: { tamano: 'md' } }
export const ConNombreAccesible: Story = { args: { etiqueta: 'Vehículo pesado' } }

export const Tamanos: Story = {
  render: () => (
    <div className="flex items-center gap-3 text-fg-primario">
      <Icono icono={Truck} tamano="xs" />
      <Icono icono={Truck} tamano="sm" />
      <Icono icono={Truck} tamano="md" />
      <Icono icono={Truck} tamano="lg" />
      <Icono icono={Truck} tamano="xl" />
    </div>
  ),
}

/** Hereda el color del contenedor: no hay una variante de ícono por color. */
export const HeredaElColor: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <span className="text-marca">
        <Icono icono={Truck} tamano="lg" />
      </span>
      <span className="text-peligro">
        <Icono icono={Truck} tamano="lg" />
      </span>
      <span className="text-exito">
        <Icono icono={Truck} tamano="lg" />
      </span>
    </div>
  ),
}
