import { cva, type VariantProps } from 'class-variance-authority'
import type { LucideIcon } from 'lucide-react'
import { Button as BotonBase } from '@/shared/ui/base/button'
import { Icono } from '@/shared/ui/Icono'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/utils/cn'

/**
 * Familia A — `Boton`. Origen: ENVOLVER (02-primitivas.md, mapa de cobertura).
 *
 * Lo que aporta la envoltura sobre el `button` copiado:
 *  - Las 6 variantes de ORBI (`superficie`, `peligro-contorno`, `fantasma`…),
 *    que shadcn no tiene.
 *  - `cargando`: spinner + BLOQUEO DEL DOBLE SUBMIT. El doble submit es el bug
 *    de formulario más común y un POST duplicado choca contra la idempotencia
 *    del backend.
 *  - El glow de hover de la primaria, que es firma visual de ORBI.
 *
 * Por qué se apoya en `variant="link"` del componente copiado y no en `default`:
 * `link` es la ÚNICA variante de shadcn sin clases de color de fondo y sin
 * ningún modificador `dark:`. Cualquier otra traería un `dark:hover:bg-muted/50`
 * que, con nuestra variante `dark` atada a `data-theme="dark"`, se activaría en
 * el tema por defecto y le ganaría a nuestro hover. Neutralizar eso desde
 * afuera cuesta una clase (`hover:no-underline`); editar el archivo copiado
 * costaría la re-copia entera.
 *
 * REGLA: una sola acción primaria por vista. Si todo es primario, nada lo es.
 */

const variantesBoton = cva('', {
  variants: {
    variante: {
      primaria: 'bg-accion text-accion-fg hover:bg-accion-hover hover:shadow-accion-sm',
      secundaria:
        'border-borde bg-transparent text-fg-primario hover:border-borde-hover hover:bg-superficie-2',
      fantasma: 'bg-transparent text-fg-secundario hover:bg-superficie-2 hover:text-fg-primario',
      superficie: 'bg-superficie-2 text-fg-primario hover:bg-superficie-3',
      peligro: 'bg-peligro text-fg-sobre-color hover:bg-peligro/85',
      'peligro-contorno': 'border-peligro text-peligro hover:bg-peligro-fondo',
    },
    tamano: {
      sm: 'h-8 gap-1.5 rounded-sm px-3 text-xs',
      md: 'h-10 gap-2 rounded-md px-4 text-sm',
      lg: 'h-11 gap-2 rounded-md px-5 text-base',
      xl: 'h-12 gap-2.5 rounded-lg px-6 text-base',
    },
    anchoCompleto: {
      true: 'w-full',
      false: '',
    },
  },
  defaultVariants: {
    variante: 'primaria',
    tamano: 'md',
    anchoCompleto: false,
  },
})

type VariantesBoton = VariantProps<typeof variantesBoton>

export interface BotonProps
  extends Omit<React.ComponentProps<typeof BotonBase>, 'variant' | 'size'> {
  variante?: NonNullable<VariantesBoton['variante']>
  tamano?: NonNullable<VariantesBoton['tamano']>
  anchoCompleto?: boolean
  /** Muestra progreso y bloquea la interacción. Implica `disabled`. */
  cargando?: boolean
  /** Alias en español de `disabled`. Cualquiera de los dos inhabilita. */
  deshabilitado?: boolean
  iconoIzq?: LucideIcon
  iconoDer?: LucideIcon
}

export function Boton({
  variante = 'primaria',
  tamano = 'md',
  anchoCompleto = false,
  cargando = false,
  deshabilitado,
  iconoIzq,
  iconoDer,
  disabled,
  className,
  children,
  ...resto
}: BotonProps) {
  const inhabilitado = disabled === true || deshabilitado === true || cargando

  return (
    <BotonBase
      variant="link"
      disabled={inhabilitado}
      /*
       * `nativeButton` de Base UI vale `true` por default y significa "el elemento renderizado ES un
       * <button> nativo". Con `render={<Link/>}` el elemento real es un <a>, y la contradiccion la
       * cantaba la consola en CADA render de las fichas ("A component that acts as a button expected
       * a native <button>…"): ademas de ensuciar la consola, el elemento se quedaba sin la
       * semantica de boton que Base UI le agrega a mano cuando sabe que no hay <button>.
       * Se deriva de `render` en vez de exponer una prop nueva: quien pasa `render` no tiene por que
       * conocer el detalle interno de la primitiva.
       */
      nativeButton={resto.render === undefined}
      aria-busy={cargando || undefined}
      className={cn(
        'border font-semibold no-underline transition-colors duration-150 ease-out',
        'hover:no-underline',
        'focus-visible:ring-3 focus-visible:ring-foco/35 focus-visible:border-foco',
        variantesBoton({ variante, tamano, anchoCompleto }),
        className
      )}
      {...resto}
    >
      {cargando ? <Spinner tamano="sm" /> : iconoIzq ? <Icono icono={iconoIzq} tamano="md" /> : null}
      {children}
      {iconoDer && !cargando ? <Icono icono={iconoDer} tamano="md" /> : null}
    </BotonBase>
  )
}
