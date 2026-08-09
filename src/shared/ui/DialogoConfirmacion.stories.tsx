import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Boton } from './Boton'
import { DialogoConfirmacion, type VarianteDialogo } from './DialogoConfirmacion'

// Anotación en vez de `satisfies`: ver la nota en `Modal.stories.tsx`.
const meta: Meta<typeof DialogoConfirmacion> = {
  title: 'Primitivas/E Superficie/DialogoConfirmacion',
  component: DialogoConfirmacion,
}

export default meta
type Story = StoryObj<typeof DialogoConfirmacion>

function Demo({
  variante,
  cargando = false,
}: {
  variante: VarianteDialogo
  cargando?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <Boton variante={variante === 'normal' ? 'primaria' : 'peligro'} onClick={() => setAbierto(true)}>
        Abrir diálogo
      </Boton>
      <DialogoConfirmacion
        abierto={abierto}
        variante={variante}
        cargando={cargando}
        onCerrar={() => setAbierto(false)}
        onConfirmar={() => setAbierto(false)}
        titulo={variante === 'normal' ? '¿Guardar los cambios?' : '¿Dar de baja el vehículo?'}
        descripcion={
          variante === 'normal'
            ? 'Se aplican al instante.'
            : 'La baja no se puede deshacer. El historial se conserva.'
        }
        textoConfirmar={variante === 'normal' ? 'Guardar' : 'Dar de baja'}
        etiquetaTipeo="Escribí la patente para confirmar:"
        valorEsperado="AB123CD"
      />
    </>
  )
}

export const Normal: Story = { render: () => <Demo variante="normal" /> }
export const Peligro: Story = { render: () => <Demo variante="peligro" /> }

/**
 * El botón queda deshabilitado hasta que el texto coincida EXACTAMENTE. Es lo
 * que separa "cancelar por error" de "cancelar a propósito" en una acción que
 * no se puede deshacer.
 */
export const PeligroConTipeo: Story = { render: () => <Demo variante="peligro-con-tipeo" /> }

export const Cargando: Story = { render: () => <Demo variante="peligro" cargando /> }
