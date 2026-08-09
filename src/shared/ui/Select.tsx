import {
  Select as SelectBase,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/base/select'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/utils/cn'

/**
 * Familia B — `Select`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Lo que ya viene de Base UI y NO se reimplementa (R11): `role="combobox"`,
 * navegación con flechas, `Home`/`End`, type-ahead, `Escape` cierra, portal con
 * detección de colisión y foco devuelto al disparador. Un desplegable dibujado
 * con `div`s sin ese patrón es un menú que el teclado no puede usar.
 *
 * Lo que aporta la envoltura, y es lo que shadcn no puede saber:
 *  - `cargando` y `sin-opciones` como ESTADOS DE PRIMERA. Las opciones de este
 *    Select llegan de un endpoint de catálogo, nunca hardcodeadas: los estados,
 *    tipos y marcas viven en tablas de la base, no como enum en el front. Un
 *    Select cuyo catálogo todavía no cargó no es un Select vacío.
 *  - API por `opciones[]` en vez de composición manual.
 *
 * PENDIENTE (DA-FE-IMPL-02): la variante `enriquecido`/`buscable` del catálogo.
 * Se resuelve con `command` + `popover` de shadcn, que NO están en el corte P0
 * (`popover` es P1). Escribir un combobox buscable a mano viola R11 —
 * 3 a 6 semanas y 9 combinaciones de testeo manual— así que no se improvisa.
 * Decide: PO / equipo de frontend, al entrar el primer catálogo largo.
 */

export interface OpcionSelect {
  valor: string
  etiqueta: string
  deshabilitada?: boolean
}

export interface SelectProps {
  opciones: OpcionSelect[]
  valor?: string
  onCambio?: (valor: string) => void
  /** Texto cuando no hay selección. Ya resuelto por i18n. */
  placeholder?: string
  /** El catálogo todavía está viajando. Bloquea el control. */
  cargando?: boolean
  /** Texto del estado sin-opciones. Ya resuelto por i18n. */
  textoSinOpciones?: string
  /** Texto del estado cargando. Ya resuelto por i18n. */
  textoCargando?: string
  deshabilitado?: boolean
  invalido?: boolean
  id?: string
  name?: string
  'aria-describedby'?: string
  className?: string
}

export function Select({
  opciones,
  valor,
  onCambio,
  placeholder,
  cargando = false,
  textoSinOpciones = 'Sin opciones',
  textoCargando = 'Cargando…',
  deshabilitado = false,
  invalido,
  id,
  name,
  className,
  ...resto
}: SelectProps) {
  const sinOpciones = !cargando && opciones.length === 0

  return (
    <SelectBase
      items={opciones.map((o) => ({ label: o.etiqueta, value: o.valor }))}
      value={valor}
      onValueChange={(v) => onCambio?.(String(v))}
      disabled={deshabilitado || cargando || sinOpciones}
      name={name}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalido || undefined}
        className={cn(
          'h-10 w-full rounded-md border-borde bg-superficie-2 px-3 text-sm text-fg-primario',
          'hover:border-borde-hover',
          'focus-visible:border-foco focus-visible:ring-3 focus-visible:ring-foco/35',
          'data-[disabled]:bg-superficie-1 data-[disabled]:text-fg-terciario',
          'aria-invalid:border-peligro aria-invalid:ring-peligro/20',
          className
        )}
        {...resto}
      >
        {cargando ? (
          <span className="flex items-center gap-2 text-fg-terciario">
            <Spinner tamano="sm" />
            {textoCargando}
          </span>
        ) : sinOpciones ? (
          <span className="text-fg-terciario">{textoSinOpciones}</span>
        ) : (
          <SelectValue
            placeholder={placeholder}
            className="text-fg-primario data-[placeholder]:text-fg-terciario"
          />
        )}
      </SelectTrigger>

      <SelectContent className="border border-borde bg-superficie-3 text-fg-primario shadow-lg">
        {opciones.map((o) => (
          <SelectItem
            key={o.valor}
            value={o.valor}
            disabled={o.deshabilitada}
            className="px-2 py-1.5 text-sm"
          >
            {o.etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectBase>
  )
}
