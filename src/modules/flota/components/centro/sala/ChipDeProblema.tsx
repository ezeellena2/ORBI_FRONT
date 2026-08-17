import { useTranslation } from 'react-i18next'
import type { ProblemaOperativoListItemDto } from '@/services/contracts/flota'
import { cn } from '@/shared/utils/cn'
import { BadgeEstadoProblema, BadgeSlaProblema } from '../BadgesDelCentro'
import { claseDeFondoPorVariante } from '../formato-centro'
import { formatearFechaHora } from '../../detalle/formato'
import { varianteDeSeveridadProblema } from '../../../vocabulario-centro-problemas'
import { patenteDelProblema } from '../../../vocabulario-sala-problemas'

/**
 * Una fila de la cola priorizada (`problem-chip` de la ficha §4.1).
 *
 * ── LA FECHA VA COMPLETA, NO SOLO LA HORA ─────────────────────────────────────────────────────
 * El mockup muestra `09:49`. Eso es correcto para una bandeja acotada al día, y la nuestra **no lo
 * está**: `GET /problemas` no filtra por fecha (B-17) y devuelve los problemas de la organización
 * ordenados por prioridad, así que en la misma pantalla conviven uno de hace 5 minutos y uno de hace
 * 3 días. Con solo la hora, los dos se leen igual.
 *
 * ── EL CONDUCTOR NO REEMPLAZA A LA PATENTE ────────────────────────────────────────────────────
 * Se muestran los dos cuando existen: hay tipos de problema que cuelgan del conductor
 * (`licencia_vencida`) y otros del vehículo, y el DTO permite que estén los dos, uno, o ninguno.
 * `patente` puede ser el **string vacío** (no `null`), por eso pasa por `patenteDelProblema`.
 */
export function ChipDeProblema({
  problema,
  seleccionado,
  onSeleccionar,
}: {
  problema: ProblemaOperativoListItemDto
  seleccionado: boolean
  onSeleccionar: (problemaId: string) => void
}) {
  const { t, i18n } = useTranslation('flota')

  const patente = patenteDelProblema(problema.vehiculo)
  const conductor = problema.conductor?.nombreCompleto ?? null

  return (
    <li>
      <button
        type="button"
        onClick={() => onSeleccionar(problema.id)}
        aria-current={seleccionado ? 'true' : undefined}
        className={cn(
          'flex w-full items-stretch gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 ease-out',
          seleccionado
            ? 'border-marca bg-marca-tenue'
            : 'border-borde hover:border-borde-hover hover:bg-superficie-2',
        )}
      >
        {/* Barra de severidad. El color NO es el único portador: al lado va el badge con su texto. */}
        <span
          aria-hidden
          className={cn(
            'w-1 shrink-0 rounded-full',
            claseDeFondoPorVariante(varianteDeSeveridadProblema(problema.severidad)),
          )}
        />

        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="truncate text-sm font-medium text-fg-primario">{problema.titulo}</span>

          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-secundario">
            <BadgeEstadoProblema estado={problema.estado} />
            {patente === null ? null : <span className="font-mono">{patente}</span>}
            {conductor === null ? null : <span>{conductor}</span>}
            <span>
              {problema.responsable?.nombre ?? t('centro.sala.cola.sinResponsable')}
            </span>
            {problema.senalesCount > 1 ? (
              <span>{t('centro.sala.cola.senales', { count: problema.senalesCount })}</span>
            ) : null}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <BadgeSlaProblema sla={problema.sla} />
          <span className="text-xs text-fg-terciario">
            {formatearFechaHora(problema.fechaDeteccionUtc, i18n.language)}
          </span>
        </span>
      </button>
    </li>
  )
}
