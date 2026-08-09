import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from '@/shared/ui/base/checkbox'

/**
 * `Checkbox` se ADOPTA tal cual (mapa de cobertura de `02-primitivas.md`): no
 * lleva envoltorio ORBI porque no hay gap que cubrir, así que conserva su API
 * en inglés — que es la regla declarada en §3 para la capa B1 adoptada.
 *
 * El estado INDETERMINADO ya viene resuelto, y es justo el que a mano se
 * olvida: lo pide el "seleccionar todos" de la tabla cuando la selección es
 * parcial. Sin él, "todos" miente.
 */
const meta = {
  title: 'Primitivas/B Formulario/Checkbox (adoptado)',
  component: Checkbox,
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const SinMarcar: Story = { args: { checked: false, 'aria-label': 'Seleccionar' } }
export const Marcado: Story = { args: { checked: true, 'aria-label': 'Seleccionar' } }
export const Indeterminado: Story = {
  args: { indeterminate: true, checked: false, 'aria-label': 'Seleccionar todo' },
}
export const Deshabilitado: Story = {
  args: { disabled: true, checked: false, 'aria-label': 'Seleccionar' },
}
