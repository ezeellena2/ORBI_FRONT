import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { Boton } from './Boton'
import { Select } from './Select'
import { Toggle } from './Toggle'

/**
 * La barra de filtros de un listado. Una sola, compartida por TODAS las pantallas.
 *
 * ── POR QUÉ ES UNA PRIMITIVA ──────────────────────────────────────────────────────────────────
 * Vehículos, Dispositivos y Conductores tenían cada una su propia barra, y divergieron: solo
 * Vehículos tenía buscador, los selects llevaban etiqueta visible arriba y el toggle no, así que
 * **no alineaban**; y el botón decía "Limpiar filtros" en una y "Limpiar" en el mockup. Con una
 * primitiva eso no puede volver a pasar, y el próximo listado la hereda gratis.
 *
 * ── LA REGLA DE ALINEACIÓN, QUE ES LO QUE SE VEÍA MAL ─────────────────────────────────────────
 * Todo lo que va en la fila mide **lo mismo de alto** (`h-9`) y **ningún control lleva etiqueta
 * visible arriba**: el nombre del filtro va en `aria-label`, que lo hace accesible sin romper la
 * fila. Es lo que hace el mockup (`filter-toolbar` → `filter-search` + `filter-chips`).
 *
 * Los 34px del mockup se redondean a `h-9` (36px) a propósito: el look sale de los TOKENS del
 * sistema, no de copiar el píxel del mockup — regla del `CLAUDE.md` del front.
 */
export function BarraDeFiltros({
  busqueda,
  soloActivos,
  hayFiltros,
  onLimpiar,
  etiquetaLimpiar,
  children,
}: {
  /** Ausente = la pantalla no tiene búsqueda server-side todavía. */
  busqueda?: { valor: string; onCambio: (valor: string) => void; placeholder: string; etiqueta: string }
  soloActivos?: { valor: boolean; onCambio: (valor: boolean) => void; etiqueta: string }
  hayFiltros: boolean
  onLimpiar: () => void
  etiquetaLimpiar: string
  /** Los `<FiltroSelect>` propios de la pantalla. */
  children: ReactNode
}) {
  return (
    <div
      role="search"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-borde bg-superficie-1 p-3"
    >
      {busqueda === undefined ? null : (
        <div className="relative min-w-60 flex-1 basis-65">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-terciario"
            aria-hidden
          />
          <input
            type="search"
            value={busqueda.valor}
            onChange={(e) => busqueda.onCambio(e.target.value)}
            placeholder={busqueda.placeholder}
            aria-label={busqueda.etiqueta}
            className={cn(
              'h-9 w-full rounded-md border border-borde bg-superficie-2 pr-3 pl-10 text-sm',
              'text-fg-primario placeholder:text-fg-terciario',
              'transition-colors duration-150 ease-out',
              'focus:border-marca focus:bg-superficie-1 focus:ring-2 focus:ring-marca-tenue focus:outline-none',
            )}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {children}

        {soloActivos === undefined ? null : (
          <div className="inline-flex h-9 items-center px-2 whitespace-nowrap">
            {/* `Toggle` ya renderiza su etiqueta visible: envolverlo en un `<label>` la duplicaba. */}
            <Toggle
              activo={soloActivos.valor}
              onCambio={soloActivos.onCambio}
              etiqueta={soloActivos.etiqueta}
            />
          </div>
        )}

        <Boton variante="fantasma" tamano="sm" deshabilitado={!hayFiltros} onClick={onLimpiar}>
          {etiquetaLimpiar}
        </Boton>
      </div>
    </div>
  )
}

/**
 * Un select de la barra. **Sin etiqueta visible**: el nombre del filtro va en `aria-label`, que es
 * lo que mantiene la fila alineada. Poner un `<label>` arriba desalinea todo contra el toggle y el
 * botón, que no lo llevan — es el defecto que tenía la app.
 */
export function FiltroSelect({
  etiqueta,
  ayuda,
  valor,
  onCambio,
  opciones,
  cargando,
}: {
  etiqueta: string
  /**
   * Explica POR QUÉ este filtro sirve, cuando no es obvio — p. ej. que "situación" sale de las
   * asignaciones de Flota y no de la señal del GPS, así que filtra aunque la conexión no tenga
   * datos. Va como `title`, además del `aria-label`.
   */
  ayuda?: string
  valor: string
  onCambio: (valor: string) => void
  opciones: Array<{ valor: string; etiqueta: string }>
  /** El catálogo todavía está viajando (p. ej. modelos de dispositivo). Bloquea el control. */
  cargando?: boolean
}) {
  return (
    <Select
      aria-label={ayuda === undefined ? etiqueta : `${etiqueta}. ${ayuda}`}
      title={ayuda}
      valor={valor}
      onCambio={onCambio}
      opciones={opciones}
      cargando={cargando}
      className="h-9 w-auto min-w-44"
    />
  )
}
