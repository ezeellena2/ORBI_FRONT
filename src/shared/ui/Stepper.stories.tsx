import type { Meta, StoryObj } from '@storybook/react-vite'
import { Stepper } from './Stepper'

/**
 * El stepper refleja el ESTADO REAL DEL BACKEND, no una fantasía de UI: en el
 * wizard de alta el paso 1 crea el vehículo de verdad, así que mostrarlo como
 * reversible miente.
 *
 * `salteado` ≠ `pendiente`: "no hace falta" y "todavía no" son dos cosas
 * distintas para el usuario y para el test.
 */
const meta = {
  title: 'Primitivas/G Navegacion/Stepper',
  component: Stepper,
  decorators: [
    (Story) => (
      <div className="w-[40rem]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Stepper>

export default meta
type Story = StoryObj<typeof meta>

const pasos = [
  { clave: 'datos', etiqueta: 'Datos del vehículo', descripcion: 'Patente, marca y modelo' },
  { clave: 'dispositivo', etiqueta: 'Dispositivo GPS', descripcion: 'Asignación e instalación' },
  { clave: 'conductor', etiqueta: 'Conductor', descripcion: 'Opcional' },
]

export const PrimerPasoActivo: Story = {
  args: {
    pasos: [
      { ...pasos[0], estado: 'activo' },
      { ...pasos[1], estado: 'pendiente' },
      { ...pasos[2], estado: 'pendiente' },
    ],
  },
}

export const ConPasoCompletado: Story = {
  args: {
    pasos: [
      { ...pasos[0], estado: 'completado' },
      { ...pasos[1], estado: 'activo' },
      { ...pasos[2], estado: 'pendiente' },
    ],
  },
}

export const ConPasoSalteado: Story = {
  args: {
    pasos: [
      { ...pasos[0], estado: 'completado' },
      { ...pasos[1], estado: 'completado' },
      { ...pasos[2], estado: 'salteado' },
    ],
  },
}

export const Vertical: Story = {
  args: {
    orientacion: 'vertical',
    pasos: [
      { ...pasos[0], estado: 'completado' },
      { ...pasos[1], estado: 'activo' },
      { ...pasos[2], estado: 'pendiente' },
    ],
  },
}
