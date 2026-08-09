import type { LucideIcon } from 'lucide-react'
import { Boton, type BotonProps } from '@/shared/ui/Boton'
import { Icono, type TamanoIcono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'

/**
 * Familia A — `BotonIcono`. Origen: ENVOLVER (02-primitivas.md).
 *
 * `etiqueta` es OBLIGATORIA POR TIPO: sin ella no compila. Un botón sin texto
 * visible no tiene nombre accesible, y un botón sin nombre accesible es
 * invisible para un lector de pantalla y para el test. Que el compilador lo
 * exija es la diferencia entre una convención y una garantía.
 */

const tamanos: Record<NonNullable<BotonProps['tamano']>, { caja: string; icono: TamanoIcono }> = {
  sm: { caja: 'size-8 p-0', icono: 'sm' },
  md: { caja: 'size-10 p-0', icono: 'md' },
  lg: { caja: 'size-11 p-0', icono: 'lg' },
  xl: { caja: 'size-12 p-0', icono: 'lg' },
}

export interface BotonIconoProps extends Omit<BotonProps, 'children' | 'iconoIzq' | 'iconoDer'> {
  icono: LucideIcon
  /** Nombre accesible. Ya resuelto por i18n antes de llegar acá. */
  etiqueta: string
  /** Redondeo total, para avatares y acciones flotantes. */
  circular?: boolean
}

export function BotonIcono({
  icono,
  etiqueta,
  circular = false,
  tamano = 'md',
  className,
  ...resto
}: BotonIconoProps) {
  const t = tamanos[tamano]
  return (
    <Boton
      tamano={tamano}
      aria-label={etiqueta}
      title={etiqueta}
      className={cn(t.caja, circular ? 'rounded-full' : '', className)}
      {...resto}
    >
      <Icono icono={icono} tamano={t.icono} />
    </Boton>
  )
}
