import { Lock } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { Icono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'

/**
 * Familia D — `SinAccesoOverlay`. Origen: PROPIO (02-primitivas.md).
 *
 * Codifica una decisión ratificada del contrato de permisos:
 *
 *   FALTA DE PERMISO = OVERLAY. **Nunca** redirect.
 *
 * Por qué: un redirect silencioso hace que el usuario crea que la pantalla no
 * existe, y termina pidiéndole a soporte una función que sí está — solo que no
 * la tiene habilitada. El overlay dice qué falta, con el código exacto del
 * permiso, que es lo que un admin necesita para dárselo.
 *
 * El `permiso` se muestra en mono y se puede seleccionar: es un código
 * (`flota.vehiculos.leer`), no una frase.
 *
 * Usa el velo fuerte + el vidrio del sistema (`--s-velo-fuerte`, `--s-vidrio`):
 * bloquea la pantalla pero deja ver que hay algo detrás, que es la señal de
 * "esto existe y no lo podés ver", no de "esto no existe".
 */

export interface SinAccesoOverlayProps extends React.ComponentProps<'div'> {
  /** Código del permiso faltante. Ej: `flota.vehiculos.leer`. */
  permiso: string
  /** Ya resuelto por i18n. */
  titulo?: string
  descripcion?: string
  onVolver?: () => void
  textoVolver?: string
}

export function SinAccesoOverlay({
  permiso,
  titulo = 'No tenés acceso a esta sección',
  descripcion = 'Pedile a un administrador de tu organización que te habilite este permiso.',
  onVolver,
  textoVolver = 'Volver',
  className,
  ...resto
}: SinAccesoOverlayProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'absolute inset-0 z-(--z-velo) flex items-center justify-center bg-velo-fuerte p-6',
        'backdrop-blur-vidrio',
        className
      )}
      {...resto}
    >
      <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border border-borde bg-vidrio px-8 py-10 text-center shadow-xl">
        <span className="flex size-12 items-center justify-center rounded-full bg-superficie-2 text-fg-secundario">
          <Icono icono={Lock} tamano="lg" />
        </span>
        <p className="text-lg font-semibold tracking-snug text-fg-primario">{titulo}</p>
        <p className="text-sm text-fg-secundario">{descripcion}</p>
        <code className="rounded-sm bg-superficie-2 px-2 py-1 font-mono text-xs tracking-wide text-fg-primario select-all">
          {permiso}
        </code>
        {onVolver ? (
          <Boton variante="secundaria" tamano="sm" onClick={onVolver} className="mt-2">
            {textoVolver}
          </Boton>
        ) : null}
      </div>
    </div>
  )
}
