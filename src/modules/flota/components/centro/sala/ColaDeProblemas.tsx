import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProblemaOperativoListItemDto } from '@/services/contracts/flota'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ChipDeProblema } from './ChipDeProblema'
import { TABS_DE_LA_COLA_DISPONIBLES } from '../../../vocabulario-sala-problemas'

/**
 * Panel izquierdo de la Sala: la cola priorizada (ficha §4.1).
 *
 * ── ES UNA SOLA LISTA, NO DOS SECCIONES ───────────────────────────────────────────────────────
 * La ficha pide 2 secciones colapsables: "Incidentes detectados" (cluster con hijos) y "Problemas
 * individuales". **El contrato no tiene el concepto de incidente** —ningún campo del DTO permite
 * saber que dos filas son el mismo caso correlacionado— así que agrupar por proximidad temporal y
 * regla, que es lo que hace el mockup, sería fabricar del lado del cliente una correlación que el
 * motor no hizo. El detalle y el `grep` que lo verifica están en
 * `INCIDENTES_AGRUPADOS_DISPONIBLES`.
 *
 * ── Y NO TIENE TABS ABIERTOS / RESUELTOS ──────────────────────────────────────────────────────
 * `GET /problemas` no filtra por estado (B-17): abiertos y cerrados llegan entremezclados en la
 * misma página, ordenados por prioridad. Un tab "Resueltos" que filtre lo cargado mostraría los
 * resueltos **que casualmente cayeron en esta página** y el usuario lo leería como "estos son mis
 * problemas resueltos". Se muestra todo, cada fila con su badge de estado, y la cabecera lo dice.
 *
 * ── EL ORDEN LO RESUELVE EL BACKEND (A-15) ────────────────────────────────────────────────────
 * Prioridad DESC, detección DESC, id DESC. **El front no reordena**: hacerlo acá partiría el orden
 * entre páginas (la página 2 se ordenaría sobre sus 20 filas, no sobre las 40).
 */
export function ColaDeProblemas({
  problemas,
  cargando,
  seleccionadoId,
  onSeleccionar,
  vacio,
  error,
  pie,
}: {
  problemas: readonly ProblemaOperativoListItemDto[]
  cargando: boolean
  seleccionadoId: string | null
  onSeleccionar: (problemaId: string) => void
  /** Ya elegido por la página: no hay "sin resultados" porque no hay filtros que limpiar. */
  vacio: ReactNode
  /** Solo cuando NO hay datos en mano; con datos, el fallo se avisa arriba y la lista se queda. */
  error?: ReactNode
  /** Paginación. Va adentro del panel para que no se despegue de la lista al hacer scroll. */
  pie?: ReactNode
}) {
  const { t } = useTranslation('flota')

  return (
    <section
      aria-label={t('centro.sala.cola.titulo')}
      className="flex min-h-0 flex-col gap-3 rounded-xl border border-borde bg-superficie-1 p-3 lg:w-96 lg:shrink-0"
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-fg-primario">
          {t('centro.sala.cola.titulo')}
        </h2>
        <p className="text-xs text-fg-terciario">{t('centro.sala.cola.aclaracionOrden')}</p>
        {/*
          La aclaración de que no se puede filtrar NO es una nota de desarrollo: sin ella, un
          operador que ve problemas resueltos mezclados con abiertos concluye que la pantalla está
          rota. El día que B-17 cierre, entra la toolbar y esta línea sale.
        */}
        {TABS_DE_LA_COLA_DISPONIBLES ? null : (
          <p className="text-xs text-fg-terciario">
            {t('centro.sala.cola.aclaracionSinFiltros')}
          </p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {cargando ? <Skeleton variante="fila-tabla" repetir={6} /> : null}

        {!cargando && error !== undefined ? error : null}

        {!cargando && error === undefined && problemas.length === 0 ? vacio : null}

        {!cargando && error === undefined && problemas.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {problemas.map((problema) => (
              <ChipDeProblema
                key={problema.id}
                problema={problema}
                seleccionado={problema.id === seleccionadoId}
                onSeleccionar={onSeleccionar}
              />
            ))}
          </ul>
        ) : null}
      </div>

      {pie === undefined ? null : <div className="shrink-0">{pie}</div>}
    </section>
  )
}
