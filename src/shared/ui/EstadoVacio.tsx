import type { LucideIcon } from 'lucide-react'
import { Icono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'

/**
 * Familia D — `EstadoVacio`. Origen: PROPIO (02-primitivas.md).
 *
 * Codifica una regla de producto que ningún upstream puede conocer:
 *
 *   `sin-datos` ≠ `sin-resultados`.
 *
 * "Todavía no cargaste vehículos" ofrece CREAR.
 * "Ningún vehículo coincide con tus filtros" ofrece LIMPIAR FILTROS.
 * Son dos problemas distintos y ofrecer el CTA equivocado deja al usuario
 * trabado: el botón "Crear vehículo" no ayuda a alguien que tiene 400 vehículos
 * y un filtro mal puesto.
 *
 * Por eso `variante` es obligatoria por tipo: no hay un vacío genérico.
 */

export type VarianteEstadoVacio = 'sin-datos' | 'sin-resultados'

export interface EstadoVacioProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  variante: VarianteEstadoVacio
  /** Ya resuelto por i18n antes de llegar acá (R5). */
  titulo: string
  descripcion?: string
  icono?: LucideIcon
  /** El CTA. Para `sin-resultados`, "limpiar filtros"; para `sin-datos`, crear. */
  acciones?: React.ReactNode
}

export function EstadoVacio({
  variante,
  titulo,
  descripcion,
  icono,
  acciones,
  className,
  ...resto
}: EstadoVacioProps) {
  return (
    <div
      data-variante={variante}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-borde',
        'bg-superficie-1/40 px-6 py-12 text-center',
        className
      )}
      {...resto}
    >
      {icono ? (
        <span className="flex size-12 items-center justify-center rounded-full bg-superficie-2 text-fg-terciario">
          <Icono icono={icono} tamano="lg" />
        </span>
      ) : null}
      <p className="text-lg font-semibold tracking-snug text-fg-primario">{titulo}</p>
      {descripcion ? (
        <p className="max-w-md text-sm text-fg-secundario">{descripcion}</p>
      ) : null}
      {acciones ? <div className="mt-1 flex items-center gap-2">{acciones}</div> : null}
    </div>
  )
}
