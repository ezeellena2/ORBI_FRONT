import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/base/dialog'
import { cn } from '@/shared/utils/cn'

/**
 * Familia E — `Modal`. Origen: ENVOLVER (02-primitivas.md).
 *
 * EL COMPORTAMIENTO CRÍTICO YA VIENE de Base UI y no se reimplementa (R11):
 * foco atrapado y devuelto al disparador al cerrar, `Escape`, bloqueo del
 * scroll de fondo y portal. Un modal que no atrapa el foco deja al teclado
 * navegando la página de atrás sin verla.
 *
 * Gaps propios:
 *  - Los 4 tamaños del catálogo (`sm` · `md` · `lg` · `pantalla-completa`).
 *  - `cierrePorFuera`, que hay que poner en `false` cuando hay un formulario
 *    con cambios. Perder una carga de 15 campos por un click al costado es la
 *    queja más cara de reparar. Base UI lo expresa invertido, como
 *    `disablePointerDismissal`.
 *  - El pie como slot, para que las acciones no se dibujen distinto en cada
 *    pantalla.
 */

export type TamanoModal = 'sm' | 'md' | 'lg' | 'pantalla-completa'

const tamanos: Record<TamanoModal, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-3xl',
  'pantalla-completa': 'h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none sm:max-w-none',
}

export interface ModalProps {
  abierto: boolean
  onCerrar: () => void
  /** Ya resuelto por i18n. Es el nombre accesible del diálogo. */
  titulo: string
  descripcion?: string
  tamano?: TamanoModal
  /** `false` si hay un formulario con cambios sin guardar. */
  cierrePorFuera?: boolean
  pie?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  tamano = 'md',
  cierrePorFuera = true,
  pie,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog
      open={abierto}
      onOpenChange={(valor) => {
        if (!valor) onCerrar()
      }}
      disablePointerDismissal={!cierrePorFuera}
    >
      <DialogContent
        className={cn(
          'border border-borde bg-superficie-1 text-fg-primario shadow-xl ring-0',
          tamanos[tamano],
          className
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight text-fg-primario">
            {titulo}
          </DialogTitle>
          {descripcion ? (
            <DialogDescription className="text-sm text-fg-secundario">
              {descripcion}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="text-sm text-fg-primario">{children}</div>

        {pie ? (
          <DialogFooter className="gap-2 border-t border-borde bg-transparent pt-4">
            {pie}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
