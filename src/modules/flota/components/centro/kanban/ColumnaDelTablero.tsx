import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProblemaOperativoListItemDto } from '@/services/contracts/flota'
import { Skeleton } from '@/shared/ui/Skeleton'
import { CardDeProblema } from './CardDeProblema'
import {
  MAXIMO_VISIBLE_RESUELTO_HOY,
  claveDeAyudaDeColumna,
  claveDeColumnaDelTablero,
  columnaSeRecorta,
  type ColumnaDelTablero as CodigoDeColumna,
} from '../../../vocabulario-kanban-problemas'

/**
 * Una columna del tablero.
 *
 * ── EL CONTADOR ES DE LA PÁGINA, Y LA CABECERA DEL TABLERO LO DICE ────────────────────────────
 * `GET /problemas` no filtra por estado (B-17), así que la columna cuenta **las cards que le
 * tocaron de esta página**, no los problemas de la organización en ese estado. El rótulo vive una
 * sola vez, arriba del tablero, para no repetir la misma advertencia 4 veces.
 *
 * ── LA AYUDA DE CADA COLUMNA NO ES DECORATIVA ─────────────────────────────────────────────────
 * "Detectado" agrupa 3 estados del catálogo (`detectado`, `priorizado`, `asignado`), así que un
 * problema **con responsable** aparece ahí; sin la línea de ayuda eso se lee como un bug. Y
 * "Resuelto hoy" tiene que decir que "hoy" es el día del navegador (DA-PC-16).
 */
export function ColumnaDelTablero({
  columna,
  problemas,
  cargando,
  arrastrable,
  motivoDeArrastreApagado,
}: {
  columna: CodigoDeColumna
  problemas: readonly ProblemaOperativoListItemDto[]
  cargando: boolean
  arrastrable: boolean
  /** Ya resuelto por i18n. */
  motivoDeArrastreApagado: string
}) {
  const { t } = useTranslation('flota')

  const [expandida, setExpandida] = useState(false)

  const recorta = columnaSeRecorta(columna) && !expandida
  const visibles = recorta ? problemas.slice(0, MAXIMO_VISIBLE_RESUELTO_HOY) : problemas
  const ocultas = problemas.length - visibles.length

  return (
    <section
      aria-label={t(claveDeColumnaDelTablero(columna))}
      className="flex min-h-0 min-w-64 flex-1 flex-col gap-2 rounded-xl border border-borde bg-superficie-1 p-3"
    >
      <header className="flex flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-fg-primario">
            {t(claveDeColumnaDelTablero(columna))}
          </h3>
          <span className="font-mono text-xs tabular-nums text-fg-terciario">
            {problemas.length}
          </span>
        </div>
        <p className="text-xs text-fg-terciario">{t(claveDeAyudaDeColumna(columna))}</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {cargando ? <Skeleton variante="fila-tabla" repetir={3} /> : null}

        {!cargando && problemas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-borde px-3 py-6 text-center text-xs text-fg-terciario">
            {t('centro.kanban.columnaVacia')}
          </p>
        ) : null}

        {!cargando && visibles.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {visibles.map((problema) => (
              <CardDeProblema
                key={problema.id}
                problema={problema}
                arrastrable={arrastrable}
                motivoDeArrastreApagado={motivoDeArrastreApagado}
              />
            ))}
          </ul>
        ) : null}

        {/*
          "Ver N más" (ficha §4.2) es expansión LOCAL de lo que ya está cargado, no una segunda
          página: no hay endpoint que traiga "el resto de los cerrados de hoy" (B-17). Por eso el
          botón dice cuántas de ESTA página quedan ocultas, y nunca promete traer más.
        */}
        {ocultas > 0 ? (
          <button
            type="button"
            onClick={() => setExpandida(true)}
            className="rounded-sm px-2 py-1.5 text-xs text-marca hover:bg-superficie-2"
          >
            {t('centro.kanban.verMas', { count: ocultas })}
          </button>
        ) : null}
      </div>
    </section>
  )
}
