import { useId } from 'react'
import { Label } from '@/shared/ui/base/label'
import { cn } from '@/shared/utils/cn'

/**
 * Familia B — `Campo`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Es OBLIGATORIO alrededor de todo control de entrada. Es quien conecta
 * `label` ↔ control ↔ ayuda ↔ error por `id` / `for` / `aria-describedby` /
 * `aria-invalid`. Si cada pantalla lo cablea a mano, la mitad queda sin `for` y
 * el click en la etiqueta deja de enfocar el campo.
 *
 * Funciona SIN react-hook-form a propósito: la primitiva tiene que servir
 * también fuera de un formulario (un filtro de toolbar, un buscador). Por eso
 * el cableado se entrega como datos, no como contexto de una librería.
 *
 * Uso recomendado — children como función, que es lo que garantiza el cableado:
 *
 *   <Campo etiqueta="Patente" error={errores.patente} requerido>
 *     {(control) => <Input {...control} value={v} onChange={…} />}
 *   </Campo>
 *
 * El texto de error entra YA RESUELTO desde `message_key` (R5): la primitiva
 * solo lo pinta y marca `aria-invalid`. El copy no vive acá.
 */

export interface PropsControlCampo {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': boolean | undefined
  required: boolean | undefined
}

export interface CampoProps extends Omit<React.ComponentProps<'div'>, 'children' | 'id'> {
  /** Texto de la etiqueta. Ya resuelto por i18n. */
  etiqueta: string
  /** Texto de ayuda debajo del control. */
  ayuda?: string
  /** Mensaje de error ya resuelto. Su presencia marca el campo como inválido. */
  error?: string
  requerido?: boolean
  variante?: 'apilado' | 'en-linea'
  /** Se genera uno si no se pasa. */
  id?: string
  children: React.ReactNode | ((control: PropsControlCampo) => React.ReactNode)
}

export function Campo({
  etiqueta,
  ayuda,
  error,
  requerido = false,
  variante = 'apilado',
  id,
  className,
  children,
  ...resto
}: CampoProps) {
  const generado = useId()
  const idControl = id ?? `campo-${generado}`
  const idAyuda = ayuda ? `${idControl}-ayuda` : undefined
  const idError = error ? `${idControl}-error` : undefined
  const describedBy = [idAyuda, idError].filter(Boolean).join(' ') || undefined

  const control: PropsControlCampo = {
    id: idControl,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    required: requerido || undefined,
  }

  return (
    <div
      className={cn(
        'group/campo',
        variante === 'en-linea'
          ? 'flex items-center justify-between gap-4'
          : 'flex flex-col gap-1.5',
        className
      )}
      {...resto}
    >
      <Label htmlFor={idControl} className="text-sm font-medium text-fg-primario">
        {etiqueta}
        {requerido ? (
          <span className="text-peligro" aria-hidden>
            *
          </span>
        ) : null}
      </Label>

      <div className={variante === 'en-linea' ? 'shrink-0' : ''}>
        {typeof children === 'function' ? children(control) : children}
      </div>

      {ayuda ? (
        <p id={idAyuda} className="text-xs text-fg-secundario">
          {ayuda}
        </p>
      ) : null}

      {error ? (
        <p id={idError} role="alert" className="text-xs font-medium text-peligro">
          {error}
        </p>
      ) : null}
    </div>
  )
}
