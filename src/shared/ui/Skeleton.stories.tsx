import type { Meta, StoryObj } from '@storybook/react-vite'
import { Skeleton } from './Skeleton'

const meta = {
  title: 'Primitivas/D Estado/Skeleton',
  component: Skeleton,
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Linea: Story = { args: { variante: 'linea' } }
export const Bloque: Story = { args: { variante: 'bloque' } }
export const Circulo: Story = { args: { variante: 'circulo' } }
/** La misma altura que la fila real, para que la tabla no salte al cargar. */
export const FilaTabla: Story = { args: { variante: 'fila-tabla', repetir: 4 } }
