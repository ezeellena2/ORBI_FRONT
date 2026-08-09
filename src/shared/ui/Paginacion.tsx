import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Select } from '@/shared/ui/Select'
import { cn } from '@/shared/utils/cn'

/**
 * Familia C — `Paginacion`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Es paginación SERVER-SIDE de verdad: emite `onCambio` y no toca los datos.
 *
 * `opcionesTamano` es OBLIGATORIA POR TIPO, y eso es deliberado: la primitiva
 * NO inventa defaults. El tamaño de página y el máximo salen del contrato de la
 * API del módulo (en la plataforma, default 20 y máximo 100). Un "10" copiado
 * de un mockup ya generó una corrección documentada; el compilador es más
 * barato que esa corrección.
 *
 * Estados que la primitiva distingue, porque cada uno deshabilita algo distinto:
 * primera página · última página · página única · deshabilitada (mientras carga).
 */

export interface PaginacionProps extends Omit<React.ComponentProps<'nav'>, 'onChange'> {
  variante?: 'completa' | 'compacta'
  /** 1-based, como lo expone el contrato de paginación. */
  pagina: number
  tamanoPagina: number
  total: number
  /** Tamaños válidos SEGÚN EL CONTRATO del endpoint. No hay default. */
  opcionesTamano: number[]
  onCambio: (cambio: { pagina: number; tamanoPagina: number }) => void
  /** Bloquea los controles mientras viaja la página siguiente. */
  deshabilitada?: boolean
  /** Textos ya resueltos por i18n (R5). */
  textos?: {
    anterior?: string
    siguiente?: string
    porPagina?: string
    rango?: (desde: number, hasta: number, total: number) => string
  }
}

export function Paginacion({
  variante = 'completa',
  pagina,
  tamanoPagina,
  total,
  opcionesTamano,
  onCambio,
  deshabilitada = false,
  textos,
  className,
  ...resto
}: PaginacionProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina))
  const enPrimera = pagina <= 1
  const enUltima = pagina >= totalPaginas
  const desde = total === 0 ? 0 : (pagina - 1) * tamanoPagina + 1
  const hasta = Math.min(total, pagina * tamanoPagina)

  const etiquetaAnterior = textos?.anterior ?? 'Página anterior'
  const etiquetaSiguiente = textos?.siguiente ?? 'Página siguiente'
  const etiquetaRango =
    textos?.rango?.(desde, hasta, total) ?? `${desde}–${hasta} de ${total}`

  return (
    <nav
      aria-label="Paginación"
      className={cn('flex items-center justify-between gap-4 py-2', className)}
      {...resto}
    >
      <p className="text-sm text-fg-secundario" aria-live="polite">
        {etiquetaRango}
      </p>

      <div className="flex items-center gap-3">
        {variante === 'completa' ? (
          <label className="flex items-center gap-2 text-sm text-fg-secundario">
            {textos?.porPagina ?? 'Por página'}
            <Select
              className="h-8 w-20"
              valor={String(tamanoPagina)}
              deshabilitado={deshabilitada}
              opciones={opcionesTamano.map((n) => ({ valor: String(n), etiqueta: String(n) }))}
              onCambio={(v) => onCambio({ pagina: 1, tamanoPagina: Number(v) })}
            />
          </label>
        ) : null}

        <div className="flex items-center gap-1">
          <BotonIcono
            variante="secundaria"
            tamano="sm"
            icono={ChevronLeft}
            etiqueta={etiquetaAnterior}
            deshabilitado={deshabilitada || enPrimera}
            onClick={() => onCambio({ pagina: pagina - 1, tamanoPagina })}
          />
          <span className="min-w-16 text-center font-mono text-sm tabular-nums text-fg-primario">
            {pagina}/{totalPaginas}
          </span>
          <BotonIcono
            variante="secundaria"
            tamano="sm"
            icono={ChevronRight}
            etiqueta={etiquetaSiguiente}
            deshabilitado={deshabilitada || enUltima}
            onClick={() => onCambio({ pagina: pagina + 1, tamanoPagina })}
          />
        </div>
      </div>
    </nav>
  )
}
