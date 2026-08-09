import { useId, useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/base/alert-dialog'
import { Boton } from '@/shared/ui/Boton'
import { Input } from '@/shared/ui/Input'
import { cn } from '@/shared/utils/cn'

/**
 * Familia E — `Dialogo de confirmación`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Se apoya en `alert-dialog` porque un diálogo de confirmación NO es un modal
 * cualquiera: `role="alertdialog"`, no se cierra con click afuera y el foco
 * arranca en la acción segura. Todo eso ya viene resuelto.
 *
 * Gap propio: la variante `peligro-con-tipeo`.
 * El usuario tiene que escribir un valor exacto —la patente del vehículo que da
 * de baja— y el botón de confirmar queda deshabilitado hasta que coincida. No
 * es ceremonia: es lo que separa "cancelar por error" de "cancelar a propósito"
 * en una acción que no se puede deshacer, y la ficha de vehículos ya lo exige
 * para la baja.
 *
 * Detalles que no son opcionales:
 *  - La comparación es EXACTA (sin `toLowerCase`): si el dato es una patente,
 *    escribirla distinto es no haberla leído.
 *  - El valor esperado se muestra en mono y `select-all`, para que se pueda
 *    leer carácter por carácter — pero copiar y pegar sigue siendo posible, y
 *    está bien: el objetivo es una pausa consciente, no un examen de tipeo.
 */

export type VarianteDialogo = 'normal' | 'peligro' | 'peligro-con-tipeo'

export interface DialogoConfirmacionProps {
  abierto: boolean
  onCerrar: () => void
  onConfirmar: () => void
  variante?: VarianteDialogo
  /** Ya resueltos por i18n (R5). */
  titulo: string
  descripcion?: string
  textoConfirmar?: string
  textoCancelar?: string
  /** Etiqueta del campo de tipeo, en `peligro-con-tipeo`. */
  etiquetaTipeo?: string
  /** El valor exacto que hay que escribir. Ej: la patente. */
  valorEsperado?: string
  /** Hay una operación en curso: bloquea las dos acciones. */
  cargando?: boolean
}

/**
 * El cuerpo vive en su propio componente y se monta DENTRO del popup. Eso es lo
 * que hace que el texto tipeado se limpie solo al cerrar: Base UI desmonta el
 * popup, y con él este estado.
 *
 * La alternativa —un `useEffect` que borre el estado cuando `abierto` pasa a
 * false— es un `setState` dentro de un efecto, que React 19 marca como
 * antipatrón: reintroduce un render extra para un valor que el árbol ya sabe.
 * Y si se omite, el diálogo recuerda lo que se escribió la vez anterior y
 * reabre con el botón destructivo YA habilitado, sin que nadie lo haya
 * confirmado esta vez. Que es exactamente el bug que esta variante existe para
 * evitar.
 */
function CuerpoConfirmacion({
  onCerrar,
  onConfirmar,
  esPeligro,
  pideTipeo,
  textoConfirmar,
  textoCancelar,
  etiquetaTipeo,
  valorEsperado,
  cargando,
}: {
  onCerrar: () => void
  onConfirmar: () => void
  esPeligro: boolean
  pideTipeo: boolean
  textoConfirmar: string
  textoCancelar: string
  etiquetaTipeo: string
  valorEsperado?: string
  cargando: boolean
}) {
  const idTipeo = useId()
  const [tipeado, setTipeado] = useState('')

  // Comparación EXACTA, sin `toLowerCase`: si el dato es una patente,
  // escribirla distinto es no haberla leído.
  const coincide = !pideTipeo || (valorEsperado !== undefined && tipeado === valorEsperado)

  return (
    <>
      {pideTipeo && valorEsperado !== undefined ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idTipeo} className="text-sm text-fg-secundario">
            {etiquetaTipeo}{' '}
            <code className="rounded-sm bg-superficie-2 px-1.5 py-0.5 font-mono text-xs tracking-wide text-fg-primario select-all">
              {valorEsperado}
            </code>
          </label>
          <Input
            id={idTipeo}
            mono
            autoComplete="off"
            value={tipeado}
            onChange={(evento) => setTipeado(evento.target.value)}
          />
        </div>
      ) : null}

      <AlertDialogFooter className="gap-2">
        <Boton variante="secundaria" deshabilitado={cargando} onClick={onCerrar}>
          {textoCancelar}
        </Boton>
        <Boton
          variante={esPeligro ? 'peligro' : 'primaria'}
          cargando={cargando}
          deshabilitado={!coincide}
          onClick={onConfirmar}
        >
          {textoConfirmar}
        </Boton>
      </AlertDialogFooter>
    </>
  )
}

export function DialogoConfirmacion({
  abierto,
  onCerrar,
  onConfirmar,
  variante = 'normal',
  titulo,
  descripcion,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  etiquetaTipeo = 'Escribí el valor para confirmar',
  valorEsperado,
  cargando = false,
}: DialogoConfirmacionProps) {
  const pideTipeo = variante === 'peligro-con-tipeo'
  const esPeligro = variante !== 'normal'

  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(valor) => {
        if (!valor) onCerrar()
      }}
    >
      <AlertDialogContent
        className={cn(
          'border border-borde bg-superficie-1 text-fg-primario shadow-xl ring-0',
          esPeligro ? 'border-peligro/40' : ''
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold tracking-snug text-fg-primario">
            {titulo}
          </AlertDialogTitle>
          {descripcion ? (
            <AlertDialogDescription className="text-sm text-fg-secundario">
              {descripcion}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        <CuerpoConfirmacion
          onCerrar={onCerrar}
          onConfirmar={onConfirmar}
          esPeligro={esPeligro}
          pideTipeo={pideTipeo}
          textoConfirmar={textoConfirmar}
          textoCancelar={textoCancelar}
          etiquetaTipeo={etiquetaTipeo}
          valorEsperado={valorEsperado}
          cargando={cargando}
        />
      </AlertDialogContent>
    </AlertDialog>
  )
}
