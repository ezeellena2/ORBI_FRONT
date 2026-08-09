import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus, Trash2 } from 'lucide-react'
import { Boton } from './Boton'

/**
 * Una story POR CADA ESTADO — R3 de `02-primitivas.md`. Es la única forma de
 * ver `deshabilitado`, `cargando` y las 6 variantes sin backend real; sin esto
 * esos estados se descubren en producción.
 *
 * `hover`, `activo` y `foco-teclado` son pseudo-estados de CSS y no se pueden
 * fijar desde `args`: se verifican con `Tab` y con el puntero sobre la story
 * (checklist de §13, "recorrible con teclado y con foco visible").
 */
const meta = {
  title: 'Primitivas/A Accion/Boton',
  component: Boton,
  args: { children: 'Guardar cambios' },
} satisfies Meta<typeof Boton>

export default meta
type Story = StoryObj<typeof meta>

export const Primaria: Story = { args: { variante: 'primaria' } }
export const Secundaria: Story = { args: { variante: 'secundaria' } }
export const Fantasma: Story = { args: { variante: 'fantasma' } }
export const Superficie: Story = { args: { variante: 'superficie' } }
export const Peligro: Story = { args: { variante: 'peligro', children: 'Dar de baja' } }
export const PeligroContorno: Story = {
  args: { variante: 'peligro-contorno', children: 'Dar de baja' },
}

export const Deshabilitado: Story = { args: { deshabilitado: true } }
export const Cargando: Story = { args: { cargando: true } }

export const ConIconoIzquierda: Story = { args: { iconoIzq: Plus, children: 'Nuevo vehículo' } }
export const ConIconoDerecha: Story = { args: { iconoDer: Trash2, children: 'Eliminar' } }

export const AnchoCompleto: Story = {
  args: { anchoCompleto: true },
  render: (args) => (
    <div className="w-80">
      <Boton {...args} />
    </div>
  ),
}

export const Tamanos: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Boton tamano="sm">sm</Boton>
      <Boton tamano="md">md</Boton>
      <Boton tamano="lg">lg</Boton>
      <Boton tamano="xl">xl</Boton>
    </div>
  ),
}
