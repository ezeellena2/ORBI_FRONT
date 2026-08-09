import type { Meta, StoryObj } from '@storybook/react-vite'
import { Download, Trash2 } from 'lucide-react'
import { BarraMasiva } from './BarraMasiva'

const meta = {
  title: 'Primitivas/C Datos/BarraMasiva',
  component: BarraMasiva,
  decorators: [
    (Story) => (
      <div className="flex h-40 w-[48rem] items-end justify-center">
        <Story />
      </div>
    ),
  ],
  args: {
    cantidad: 3,
    onLimpiar: () => {},
    acciones: [
      { clave: 'exportar', etiqueta: 'Exportar', icono: Download, onSelect: () => {} },
      { clave: 'baja', etiqueta: 'Dar de baja', icono: Trash2, tono: 'peligro', onSelect: () => {} },
    ],
  },
} satisfies Meta<typeof BarraMasiva>

export default meta
type Story = StoryObj<typeof meta>

export const Visible: Story = {}
/** Sin selección la barra no se renderiza: no ocupa lugar ni deja un hueco. */
export const Oculta: Story = { args: { cantidad: 0 } }
/** Una acción masiva a medio ejecutar más un segundo click es el peor caso. */
export const AccionEnCurso: Story = { args: { enCurso: true } }
