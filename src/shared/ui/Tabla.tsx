import { useRef, useState } from 'react'
import { Checkbox } from '@/shared/ui/base/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/base/table'
import type { Columna, EstadoOrden } from '@/shared/ui/Columna'
import { EtiquetaOrden, ariaSortDe, type EstadoEtiquetaOrden } from '@/shared/ui/EtiquetaOrden'
import { Skeleton } from '@/shared/ui/Skeleton'
import { cn } from '@/shared/utils/cn'

/**
 * Familia C — `Tabla`. Origen: PROPIO SOBRE MARKUP ADOPTADO (02-primitivas.md).
 * Es la única primitiva P0 donde el gap propio supera a lo adoptado: de shadcn
 * se toma el markup y las clases; el comportamiento es de ORBI.
 *
 * ── La regla que gobierna este componente ──────────────────────────────────
 *   NO PAGINA, NO ORDENA Y NO FILTRA: AVISA.
 * Recibe filas ya resueltas y emite eventos. El orden y la paginación son
 * server-side: una tabla que ordena en el cliente muestra un orden distinto al
 * de la página siguiente, y el bug aparece recién en la página 2.
 *
 * ── Lo demás que es de ORBI ────────────────────────────────────────────────
 *  - `Columna` como descriptor, con `ordenable` OPT-IN (hay campos compuestos
 *    que llegan de otro servicio y el backend no puede ordenar).
 *  - Selección con estado INDETERMINADO en "seleccionar todos". Sin él, "todos"
 *    miente cuando la selección es parcial.
 *  - Estados `cargando` (skeleton con la misma altura de fila, para que la
 *    tabla no salte), `vacía` y `error` integrados, sin perder el encabezado.
 *  - Scroll en SU PROPIO contenedor. Nunca hace scrollear la página a lo ancho:
 *    en 12 módulos hay tablas de 10 columnas y romper el layout de la página es
 *    peor que un scroll interno.
 *  - Columnas redimensionables con el puntero, y también con teclado
 *    (flechas ← →) — un handle que solo responde al mouse deja la función
 *    fuera del alcance de quien navega con teclado.
 *
 * PENDIENTE (DA-FE-07 de 02-primitivas): el MOTOR DE DATOS de la tabla
 * (TanStack Table headless vs. lo de acá). Esta implementación es
 * deliberadamente "controlada y sin motor": todo el estado —orden, selección,
 * página— lo posee quien compone, y la tabla solo dibuja y avisa. Elegir
 * TanStack después no cambia esta API pública; cambia quién guarda el estado.
 * Decide: PO / equipo de frontend.
 */

const ANCHO_MINIMO_COLUMNA = 64

const alineaciones = {
  izquierda: 'text-left',
  centro: 'text-center',
  derecha: 'text-right',
} as const

const tiposDeCelda = {
  texto: '',
  mono: 'font-mono tracking-wide',
  numero: 'font-mono tabular-nums',
  fecha: 'tabular-nums',
  nodo: '',
  acciones: 'text-right',
} as const

export interface TablaProps<T> {
  columnas: Columna<T>[]
  filas: T[]
  /** Identidad estable de cada fila. Es la clave de selección. */
  claveFila: (fila: T) => string
  densidad?: 'normal' | 'densa'

  orden?: EstadoOrden
  onOrden?: (orden: EstadoOrden) => void

  /** Claves seleccionadas. La selección la controla quien compone, no la tabla. */
  seleccion?: string[]
  onSeleccion?: (claves: string[]) => void

  cargando?: boolean
  filasSkeleton?: number
  /** Qué mostrar sin filas. Normalmente un `<EstadoVacio>`. */
  vacio?: React.ReactNode
  /** Qué mostrar si la carga falló. Normalmente un `<EstadoError>`. */
  error?: React.ReactNode

  redimensionable?: boolean

  /** Textos accesibles, ya resueltos por i18n (R5). */
  etiquetaSeleccionarTodos?: string
  etiquetaSeleccionarFila?: string
  etiquetaRedimensionar?: string

  className?: string
}

export function Tabla<T>({
  columnas,
  filas,
  claveFila,
  densidad = 'normal',
  orden,
  onOrden,
  seleccion,
  onSeleccion,
  cargando = false,
  filasSkeleton = 5,
  vacio,
  error,
  redimensionable = false,
  etiquetaSeleccionarTodos = 'Seleccionar todas las filas',
  etiquetaSeleccionarFila = 'Seleccionar fila',
  etiquetaRedimensionar = 'Redimensionar columna',
  className,
}: TablaProps<T>) {
  const [anchos, setAnchos] = useState<Record<string, number>>({})
  const arrastre = useRef<{ clave: string; xInicial: number; anchoInicial: number } | null>(null)

  const conSeleccion = seleccion !== undefined && onSeleccion !== undefined
  const claves = filas.map(claveFila)
  const todas = conSeleccion && claves.length > 0 && claves.every((c) => seleccion.includes(c))
  const algunas = conSeleccion && !todas && claves.some((c) => seleccion.includes(c))

  const alturaFila = densidad === 'densa' ? 'h-9' : 'h-11'
  const paddingCelda = densidad === 'densa' ? 'px-2 py-1' : 'px-3 py-2'
  const columnasTotales = columnas.length + (conSeleccion ? 1 : 0)

  function cambiarOrden(columna: Columna<T>) {
    if (!columna.ordenable || !onOrden) return
    const mismaColumna = orden?.clave === columna.clave
    onOrden({
      clave: columna.clave,
      direccion: mismaColumna && orden?.direccion === 'asc' ? 'desc' : 'asc',
    })
  }

  function estadoDeOrden(columna: Columna<T>): EstadoEtiquetaOrden {
    if (!columna.ordenable) return 'sin-orden'
    return orden?.clave === columna.clave ? orden.direccion : 'sin-orden'
  }

  function anchoDe(columna: Columna<T>): number | undefined {
    return anchos[columna.clave] ?? columna.ancho
  }

  function iniciarArrastre(evento: React.PointerEvent<HTMLSpanElement>, columna: Columna<T>) {
    const th = evento.currentTarget.closest('th')
    arrastre.current = {
      clave: columna.clave,
      xInicial: evento.clientX,
      anchoInicial: anchoDe(columna) ?? th?.getBoundingClientRect().width ?? ANCHO_MINIMO_COLUMNA,
    }
    evento.currentTarget.setPointerCapture(evento.pointerId)
  }

  function moverArrastre(evento: React.PointerEvent<HTMLSpanElement>) {
    const actual = arrastre.current
    if (!actual) return
    const delta = evento.clientX - actual.xInicial
    setAnchos((previo) => ({
      ...previo,
      [actual.clave]: Math.max(ANCHO_MINIMO_COLUMNA, actual.anchoInicial + delta),
    }))
  }

  function terminarArrastre() {
    arrastre.current = null
  }

  function redimensionarConTeclado(evento: React.KeyboardEvent<HTMLSpanElement>, columna: Columna<T>) {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return
    evento.preventDefault()
    const paso = evento.key === 'ArrowRight' ? 16 : -16
    const th = evento.currentTarget.closest('th')
    const base = anchoDe(columna) ?? th?.getBoundingClientRect().width ?? ANCHO_MINIMO_COLUMNA
    setAnchos((previo) => ({
      ...previo,
      [columna.clave]: Math.max(ANCHO_MINIMO_COLUMNA, base + paso),
    }))
  }

  function alternarTodas() {
    if (!conSeleccion) return
    onSeleccion(todas ? seleccion.filter((c) => !claves.includes(c)) : [...new Set([...seleccion, ...claves])])
  }

  function alternarFila(clave: string) {
    if (!conSeleccion) return
    onSeleccion(
      seleccion.includes(clave) ? seleccion.filter((c) => c !== clave) : [...seleccion, clave]
    )
  }

  return (
    // El contenedor propio es lo que impide que la tabla arrastre el layout de
    // la página a lo ancho.
    <div
      className={cn(
        'w-full overflow-x-auto rounded-lg border border-borde bg-superficie-1',
        className
      )}
    >
      <Table className="text-fg-primario">
        <TableHeader>
          <TableRow className="border-borde hover:bg-transparent">
            {conSeleccion ? (
              <TableHead className={cn('w-10', paddingCelda)}>
                <Checkbox
                  checked={todas}
                  indeterminate={algunas}
                  onCheckedChange={alternarTodas}
                  aria-label={etiquetaSeleccionarTodos}
                  className="border-borde data-checked:border-marca data-checked:bg-marca"
                />
              </TableHead>
            ) : null}

            {columnas.map((columna) => {
              const estado = estadoDeOrden(columna)
              const ancho = anchoDe(columna)
              return (
                <TableHead
                  key={columna.clave}
                  aria-sort={columna.ordenable ? ariaSortDe(estado) : undefined}
                  style={ancho ? { width: ancho, minWidth: ancho } : undefined}
                  className={cn(
                    'relative bg-superficie-1 text-xs font-semibold tracking-wider text-fg-secundario uppercase',
                    paddingCelda,
                    alineaciones[columna.alineacion ?? 'izquierda']
                  )}
                >
                  {columna.ordenable ? (
                    <button
                      type="button"
                      onClick={() => cambiarOrden(columna)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-sm transition-colors',
                        'hover:text-fg-primario',
                        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-foco/35'
                      )}
                    >
                      {columna.titulo}
                      <EtiquetaOrden estado={estado} />
                    </button>
                  ) : (
                    columna.titulo
                  )}

                  {redimensionable ? (
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`${etiquetaRedimensionar}: ${columna.titulo}`}
                      tabIndex={0}
                      onPointerDown={(evento) => iniciarArrastre(evento, columna)}
                      onPointerMove={moverArrastre}
                      onPointerUp={terminarArrastre}
                      onKeyDown={(evento) => redimensionarConTeclado(evento, columna)}
                      className={cn(
                        'absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none',
                        'hover:bg-marca focus-visible:bg-marca focus-visible:outline-none'
                      )}
                    />
                  ) : null}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>

        <TableBody>
          {error ? (
            <TableRow className="border-borde hover:bg-transparent">
              <TableCell colSpan={columnasTotales} className="p-4">
                {error}
              </TableCell>
            </TableRow>
          ) : cargando ? (
            Array.from({ length: filasSkeleton }).map((_, indice) => (
              <TableRow key={indice} className="border-borde hover:bg-transparent">
                <TableCell colSpan={columnasTotales} className={cn(paddingCelda, alturaFila)}>
                  <Skeleton variante="fila-tabla" />
                </TableCell>
              </TableRow>
            ))
          ) : filas.length === 0 ? (
            <TableRow className="border-borde hover:bg-transparent">
              <TableCell colSpan={columnasTotales} className="p-4">
                {vacio}
              </TableCell>
            </TableRow>
          ) : (
            filas.map((fila) => {
              const clave = claveFila(fila)
              const seleccionada = conSeleccion && seleccion.includes(clave)
              return (
                <TableRow
                  key={clave}
                  data-state={seleccionada ? 'selected' : undefined}
                  className={cn(
                    'border-borde transition-colors',
                    'hover:bg-superficie-2',
                    seleccionada ? 'bg-marca-tenue hover:bg-marca-tenue' : '',
                    alturaFila
                  )}
                >
                  {conSeleccion ? (
                    <TableCell className={paddingCelda}>
                      <Checkbox
                        checked={seleccionada}
                        onCheckedChange={() => alternarFila(clave)}
                        aria-label={etiquetaSeleccionarFila}
                        className="border-borde data-checked:border-marca data-checked:bg-marca"
                      />
                    </TableCell>
                  ) : null}

                  {columnas.map((columna) => (
                    <TableCell
                      key={columna.clave}
                      className={cn(
                        'text-sm',
                        paddingCelda,
                        alineaciones[columna.alineacion ?? 'izquierda'],
                        tiposDeCelda[columna.tipo ?? 'texto']
                      )}
                    >
                      {columna.render
                        ? columna.render(fila)
                        : String((fila as Record<string, unknown>)[columna.clave] ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
