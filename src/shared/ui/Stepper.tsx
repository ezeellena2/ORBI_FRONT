import { Check, Minus } from 'lucide-react'
import { Icono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'

/**
 * Familia G — `Stepper`. Origen: PROPIO (02-primitivas.md).
 *
 * ── La regla que este componente codifica ──────────────────────────────────
 *   EL STEPPER REFLEJA EL ESTADO REAL DEL BACKEND, NO UNA FANTASÍA DE UI.
 *
 * En el wizard de alta de vehículo, el paso 1 CREA el vehículo de verdad. Si
 * cada paso persiste con su propio endpoint, un paso completado ya no se puede
 * "deshacer" volviendo atrás — y dibujarlo como reversible le miente al usuario.
 * Por eso el estado de cada paso entra por prop y el componente no lo infiere
 * del índice.
 *
 * ── `salteado` ≠ `pendiente` ───────────────────────────────────────────────
 * Son dos cosas distintas para el usuario ("no hace falta" vs. "todavía no") y
 * dos cosas distintas para el test. Por eso `salteado` es un estado propio, con
 * su ícono, y no un `pendiente` en gris claro.
 *
 * Accesibilidad: es una `<ol>` con `aria-current="step"` en el paso activo, que
 * es lo que le dice a un lector de pantalla en cuál de los tres está.
 */

export type EstadoPaso = 'pendiente' | 'activo' | 'completado' | 'salteado'

export interface PasoStepper {
  clave: string
  /** Ya resuelto por i18n. */
  etiqueta: string
  descripcion?: string
  estado: EstadoPaso
}

const marcador: Record<EstadoPaso, string> = {
  pendiente: 'border-borde bg-superficie-2 text-fg-terciario',
  activo: 'border-marca bg-marca-suave text-marca shadow-marca-sm',
  completado: 'border-exito bg-exito text-fg-sobre-color',
  salteado: 'border-borde bg-superficie-1 text-fg-terciario',
}

const etiquetaSegunEstado: Record<EstadoPaso, string> = {
  pendiente: 'text-fg-secundario',
  activo: 'font-semibold text-fg-primario',
  completado: 'text-fg-primario',
  salteado: 'text-fg-terciario line-through',
}

export interface StepperProps extends React.ComponentProps<'ol'> {
  pasos: PasoStepper[]
  orientacion?: 'horizontal' | 'vertical'
}

export function Stepper({ pasos, orientacion = 'horizontal', className, ...resto }: StepperProps) {
  return (
    <ol
      className={cn(
        orientacion === 'horizontal' ? 'flex items-start gap-2' : 'flex flex-col gap-4',
        className
      )}
      {...resto}
    >
      {pasos.map((paso, indice) => (
        <li
          key={paso.clave}
          aria-current={paso.estado === 'activo' ? 'step' : undefined}
          data-estado={paso.estado}
          className={cn(
            'flex gap-3',
            orientacion === 'horizontal' ? 'flex-1 items-start' : 'items-start'
          )}
        >
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
              marcador[paso.estado]
            )}
          >
            {paso.estado === 'completado' ? (
              <Icono icono={Check} tamano="sm" />
            ) : paso.estado === 'salteado' ? (
              <Icono icono={Minus} tamano="sm" />
            ) : (
              indice + 1
            )}
          </span>

          <span className="flex min-w-0 flex-col gap-0.5">
            <span className={cn('text-sm', etiquetaSegunEstado[paso.estado])}>
              {paso.etiqueta}
            </span>
            {paso.descripcion ? (
              <span className="text-xs text-fg-terciario">{paso.descripcion}</span>
            ) : null}
          </span>

          {orientacion === 'horizontal' && indice < pasos.length - 1 ? (
            <span aria-hidden className="mt-4 h-px flex-1 bg-borde" />
          ) : null}
        </li>
      ))}
    </ol>
  )
}
