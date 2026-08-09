import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Boton } from './Boton'
import { Modal, type TamanoModal } from './Modal'

/**
 * El comportamiento crítico ya viene de Base UI y no se reimplementa: foco
 * atrapado y devuelto al disparador, `Escape`, bloqueo del scroll de fondo y
 * portal. Un modal que no atrapa el foco deja al teclado navegando la página de
 * atrás sin verla.
 */
// Anotación en vez de `satisfies`: las stories de este archivo son `render`
// puros (el modal necesita estado local para abrirse) y `satisfies` exigiría
// repetir los `args` obligatorios en cada una sin que se usen.
const meta: Meta<typeof Modal> = {
  title: 'Primitivas/E Superficie/Modal',
  component: Modal,
}

export default meta
type Story = StoryObj<typeof Modal>

function Demo({
  tamano,
  cierrePorFuera = true,
}: {
  tamano?: TamanoModal
  cierrePorFuera?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <Boton onClick={() => setAbierto(true)}>Abrir modal</Boton>
      <Modal
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        tamano={tamano}
        cierrePorFuera={cierrePorFuera}
        titulo="Asignar dispositivo"
        descripcion="El dispositivo queda vinculado al vehículo hasta que lo desasignes."
        pie={
          <>
            <Boton variante="secundaria" onClick={() => setAbierto(false)}>
              Cancelar
            </Boton>
            <Boton onClick={() => setAbierto(false)}>Asignar</Boton>
          </>
        }
      >
        <p>Contenido del modal.</p>
      </Modal>
    </>
  )
}

export const Chico: Story = { render: () => <Demo tamano="sm" /> }
export const Medio: Story = { render: () => <Demo tamano="md" /> }
export const Grande: Story = { render: () => <Demo tamano="lg" /> }
export const PantallaCompleta: Story = { render: () => <Demo tamano="pantalla-completa" /> }

/**
 * Con un formulario con cambios sin guardar, `cierrePorFuera` va en `false`:
 * perder una carga de 15 campos por un click al costado es la queja más cara de
 * reparar.
 */
export const SinCierrePorFuera: Story = { render: () => <Demo cierrePorFuera={false} /> }
