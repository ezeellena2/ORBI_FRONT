import type { Meta, StoryObj } from '@storybook/react-vite'
import { MoreVertical, Pencil, Send, Trash2 } from 'lucide-react'
import { TooltipProvider } from '@/shared/ui/base/tooltip'
import { BotonIcono } from './BotonIcono'
import { MenuAcciones } from './MenuAcciones'

const meta = {
  title: 'Primitivas/A Accion/MenuAcciones',
  component: MenuAcciones,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="flex justify-center p-8">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
  args: {
    disparador: <BotonIcono icono={MoreVertical} etiqueta="Acciones" variante="fantasma" />,
    items: [
      { clave: 'editar', etiqueta: 'Editar', icono: Pencil, onSelect: () => {} },
      { clave: 'enviar', etiqueta: 'Enviar comando', icono: Send, onSelect: () => {} },
    ],
  },
} satisfies Meta<typeof MenuAcciones>

export default meta
type Story = StoryObj<typeof meta>

export const Cerrado: Story = {}

export const ConItemDeshabilitadoPorPermiso: Story = {
  args: {
    items: [
      { clave: 'editar', etiqueta: 'Editar', icono: Pencil, onSelect: () => {} },
      {
        clave: 'baja',
        etiqueta: 'Dar de baja',
        icono: Trash2,
        tono: 'peligro',
        deshabilitado: true,
        // El MOTIVO no es opcional: un ítem muerto sin explicación se reporta
        // como bug. Se muestra en tooltip y se repite en `sr-only`, porque un
        // tooltip sobre un elemento deshabilitado no se anuncia.
        motivo: 'Necesitás el permiso flota.vehiculos.baja',
        onSelect: () => {},
        separadorAntes: true,
      },
    ],
  },
}

export const ConItemPeligro: Story = {
  args: {
    items: [
      { clave: 'editar', etiqueta: 'Editar', icono: Pencil, onSelect: () => {} },
      {
        clave: 'baja',
        etiqueta: 'Dar de baja',
        icono: Trash2,
        tono: 'peligro',
        onSelect: () => {},
        separadorAntes: true,
      },
    ],
  },
}
