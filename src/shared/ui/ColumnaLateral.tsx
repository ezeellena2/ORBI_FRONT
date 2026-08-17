import { useState, type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

/**
 * El CROMO de una columna lateral colapsable. Port de `.module-secondary-sidebar` del mockup
 * (`docs/mockupsv2/_shared/components.css:5424`).
 *
 * ── POR QUÉ ES UNA PRIMITIVA Y NO ESTÁ ADENTRO DE CADA COLUMNA ────────────────────────────────
 * Hay DOS columnas en pantalla al mismo tiempo dentro de un módulo —la del módulo y la de la
 * pantalla, p. ej. el Centro de Problemas— y tienen que verse idénticas. Cuando cada una traía su
 * propio marcado, la del Centro quedó como **tarjeta flotante** (`rounded-xl` + padding dentro del
 * contenido) al lado de una columna a sangre: se veía despegada. Con una sola primitiva eso no
 * puede volver a pasar.
 *
 * ── LO QUE HACE DE CROMO, Y NO DE TARJETA ─────────────────────────────────────────────────────
 * Sin bordes redondeados, sin sombra, a toda altura, y separada de lo que sigue por un **borde
 * derecho** —no por aire—. El botón de colapso es un círculo que **monta sobre ese borde**
 * (`right: -14px` en el mockup), que es la firma visual de que las columnas son una sola pieza.
 *
 * Abajo de `lg` se apila: borde abajo en vez de a la derecha, ancho completo y sin colapso — el
 * mockup ahí esconde el botón y deja un estado del que no se puede salir.
 */
export function ColumnaLateral({
  titulo,
  subtitulo,
  etiquetaAria,
  etiquetaAlternar,
  claveColapso,
  children,
}: {
  titulo: string
  subtitulo?: string
  etiquetaAria: string
  etiquetaAlternar: string
  /** Clave de `localStorage`. Es POR columna: colapsar una no colapsa la otra. */
  claveColapso: string
  /** Los grupos de la columna. Reciben `colapsada` por contexto de render del consumidor. */
  children: (colapsada: boolean) => ReactNode
}) {
  const [colapsada, setColapsada] = useState(() => localStorage.getItem(claveColapso) === 'true')

  function alternar() {
    setColapsada((previo) => {
      const siguiente = !previo
      localStorage.setItem(claveColapso, String(siguiente))
      return siguiente
    })
  }

  return (
    <nav
      aria-label={etiquetaAria}
      className={cn(
        'relative flex shrink-0 flex-col border-b border-borde bg-superficie-1',
        'lg:border-r lg:border-b-0',
        colapsada ? 'lg:w-14' : 'lg:w-60',
      )}
    >
      {/*
        Monta sobre el borde derecho, como en el mockup. `hidden lg:flex` porque abajo de `lg` la
        columna se apila y el colapso no aplica.
      */}
      <button
        type="button"
        onClick={alternar}
        aria-expanded={!colapsada}
        className={cn(
          'absolute top-4 -right-3.5 z-10 hidden h-7 w-7 items-center justify-center rounded-full lg:flex',
          'border border-borde bg-superficie-1 text-fg-secundario shadow-sm',
          'transition-colors duration-150 ease-out hover:border-marca hover:text-fg-primario',
        )}
      >
        <ChevronLeft className={cn('size-3.5 transition-transform', colapsada && 'rotate-180')} aria-hidden />
        <span className="sr-only">{etiquetaAlternar}</span>
      </button>

      {colapsada ? null : (
        <div className="shrink-0 border-b border-borde px-4 pt-4 pb-3">
          <p className="text-sm font-semibold tracking-tight text-fg-primario">{titulo}</p>
          {subtitulo === undefined ? null : (
            <p className="mt-0.5 text-xs text-fg-secundario">{subtitulo}</p>
          )}
        </div>
      )}

      <div className={cn('min-h-0 flex-1 overflow-y-auto py-3', colapsada ? 'px-1.5' : 'px-0')}>
        {children(colapsada)}
      </div>
    </nav>
  )
}
