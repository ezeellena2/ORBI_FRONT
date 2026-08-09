import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/utils/cn'

/**
 * Familia C — `BarraMasiva`. Origen: PROPIO (02-primitivas.md).
 *
 * Aparece cuando hay filas seleccionadas y ofrece las acciones que aplican al
 * conjunto. Tres cosas que la hacen distinta de "una barra":
 *  - `aria-live="polite"` sobre la cuenta: quien usa lector de pantalla tiene
 *    que enterarse de que la selección cambió sin ir a buscarla.
 *  - "Limpiar selección" SIEMPRE presente. Una selección que no se puede
 *    deshacer obliga a recargar la pantalla.
 *  - `enCurso` bloquea todas las acciones a la vez: una acción masiva a medio
 *    ejecutar más un segundo click es el peor escenario de esta pantalla.
 *
 * No conoce la tabla: recibe la cuenta y emite eventos.
 */

export interface AccionMasiva {
  clave: string
  /** Ya resuelto por i18n. */
  etiqueta: string
  icono?: LucideIcon
  onSelect: () => void
  tono?: 'normal' | 'peligro'
  deshabilitada?: boolean
}

export interface BarraMasivaProps extends React.ComponentProps<'div'> {
  cantidad: number
  acciones: AccionMasiva[]
  onLimpiar: () => void
  /** Hay una acción masiva ejecutándose. */
  enCurso?: boolean
  /** Textos ya resueltos por i18n (R5). */
  textos?: {
    seleccionadas?: (cantidad: number) => string
    limpiar?: string
  }
}

export function BarraMasiva({
  cantidad,
  acciones,
  onLimpiar,
  enCurso = false,
  textos,
  className,
  ...resto
}: BarraMasivaProps) {
  if (cantidad <= 0) return null

  const etiquetaSeleccionadas =
    textos?.seleccionadas?.(cantidad) ?? `${cantidad} seleccionadas`

  return (
    <div
      role="region"
      aria-label={etiquetaSeleccionadas}
      className={cn(
        'sticky bottom-4 z-(--z-sticky) mx-auto flex w-fit items-center gap-3',
        'rounded-xl border border-borde bg-superficie-3 px-4 py-2.5 shadow-xl',
        className
      )}
      {...resto}
    >
      <span aria-live="polite" className="text-sm font-medium text-fg-primario">
        {etiquetaSeleccionadas}
      </span>

      <span aria-hidden className="h-5 w-px bg-borde" />

      <div className="flex items-center gap-2">
        {acciones.map((accion) => (
          <Boton
            key={accion.clave}
            tamano="sm"
            variante={accion.tono === 'peligro' ? 'peligro-contorno' : 'superficie'}
            iconoIzq={accion.icono}
            deshabilitado={accion.deshabilitada || enCurso}
            onClick={accion.onSelect}
          >
            {accion.etiqueta}
          </Boton>
        ))}
        {enCurso ? <Spinner tamano="sm" /> : null}
      </div>

      <BotonIcono
        variante="fantasma"
        tamano="sm"
        icono={X}
        etiqueta={textos?.limpiar ?? 'Limpiar selección'}
        deshabilitado={enCurso}
        onClick={onLimpiar}
      />
    </div>
  )
}
