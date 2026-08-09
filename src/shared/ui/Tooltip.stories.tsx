import type { Meta, StoryObj } from '@storybook/react-vite'
import { Info } from 'lucide-react'
import { BotonIcono } from './BotonIcono'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/base/tooltip'

/**
 * `Tooltip` se ADOPTA tal cual (mapa de cobertura): no hay gap propio.
 *
 * La regla de uso —NUNCA información que solo exista en el tooltip— es de
 * review, no de código: no hay tooltip en touch, y lo que solo se ve al pasar
 * el mouse no existe para la mitad de los usuarios.
 */
const meta = {
  title: 'Primitivas/E Superficie/Tooltip (adoptado)',
  component: Tooltip,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="flex justify-center p-12">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

function Demo({ lado }: { lado: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<BotonIcono icono={Info} etiqueta="Ayuda" variante="fantasma" />} />
      <TooltipContent side={lado} className="bg-superficie-3 text-fg-primario shadow-lg">
        Última señal recibida del dispositivo GPS.
      </TooltipContent>
    </Tooltip>
  )
}

export const Arriba: Story = { render: () => <Demo lado="top" /> }
export const Abajo: Story = { render: () => <Demo lado="bottom" /> }
export const Izquierda: Story = { render: () => <Demo lado="left" /> }
export const Derecha: Story = { render: () => <Demo lado="right" /> }
