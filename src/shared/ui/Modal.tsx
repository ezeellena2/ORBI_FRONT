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
 *  - **El alto maximo y el scroll del cuerpo.** Ver abajo.
 *
 * ── POR QUE EL CUERPO SCROLLEA Y EL DIALOGO TIENE TECHO ───────────────────────────────────────
 * `DialogContent` de Base UI es `fixed top-1/2 -translate-y-1/2` SIN `max-h` y SIN overflow: un
 * dialogo mas alto que la ventana se desborda por ARRIBA y por ABAJO a la vez, sin barra de scroll
 * propia y sin que la pagina de atras pueda scrollear (el modal bloquea el scroll de fondo, que es
 * lo correcto). Medido: "Registrar dispositivo" mide 814px y su boton Guardar cae en y=750 con la
 * ventana en 720px; con el panel "+ Agregar modelo" abierto mide 1131px y el submit queda fuera
 * HASTA EN 1920x1080. El unico escape era `Escape`, que descarta todo lo tipeado.
 *
 * El techo va aca y no en `base/dialog.tsx` porque el que sabe donde esta la costura header /
 * cuerpo / pie es este wrapper: se declaran las 3 filas del grid y SOLO la del medio scrollea, asi
 * el titulo y las acciones quedan siempre visibles. `min-h-0` es obligatorio — sin el, un item de
 * grid no baja de su alto de contenido y el `overflow-y-auto` no llega a activarse nunca.
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
          'max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]',
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

        {/* `min-h-0` + `overflow-y-auto`: es LA fila que cede alto. Sin `min-h-0` el item de grid
            nunca baja de su contenido y el scroll no se activa (ver el bloque de arriba).
            `-mx-1 px-1` deja aire para que el anillo de foco de un control pegado al borde no
            quede cortado por el clipping del scroll. */}
        <div className="-mx-1 min-h-0 overflow-y-auto px-1 text-sm text-fg-primario">
          {children}
        </div>

        {pie ? (
          <DialogFooter className="gap-2 border-t border-borde bg-transparent pt-4">
            {pie}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
