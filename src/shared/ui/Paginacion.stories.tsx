import type { Meta, StoryObj } from '@storybook/react-vite'
import { Paginacion } from './Paginacion'

/**
 * `opcionesTamano` es obligatoria por tipo: la primitiva NO inventa defaults.
 * El tamaño de página y el máximo salen del contrato del endpoint (en la
 * plataforma, default 20 y máximo 100). Un "10" copiado de un mockup ya generó
 * una corrección documentada.
 */
const meta = {
  title: 'Primitivas/C Datos/Paginacion',
  component: Paginacion,
  decorators: [
    (Story) => (
      <div className="w-[40rem]">
        <Story />
      </div>
    ),
  ],
  args: {
    pagina: 3,
    tamanoPagina: 20,
    total: 137,
    opcionesTamano: [20, 50, 100],
    onCambio: () => {},
  },
} satisfies Meta<typeof Paginacion>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}
export const PrimeraPagina: Story = { args: { pagina: 1 } }
export const UltimaPagina: Story = { args: { pagina: 7 } }
export const PaginaUnica: Story = { args: { pagina: 1, total: 12 } }
export const Compacta: Story = { args: { variante: 'compacta' } }
export const Deshabilitada: Story = { args: { deshabilitada: true } }
export const SinResultados: Story = { args: { pagina: 1, total: 0 } }
