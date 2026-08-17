import { useTranslation } from 'react-i18next'
import type {
  ProblemaOperativoDetalleDto,
  ProblemaOperativoListItemDto,
} from '@/services/contracts/flota'
import { Skeleton } from '@/shared/ui/Skeleton'
import { BadgeSeveridadProblema } from '../BadgesDelCentro'
import { BloqueDelCentro } from '../BloqueDelCentro'
import { DesgloseDePrioridad } from '../DesgloseDePrioridad'
import { EstadoEnVivoDelVehiculo } from '../EstadoEnVivoDelVehiculo'
import { otrosProblemasDelMismoVehiculo } from '../../../vocabulario-sala-problemas'

/**
 * Panel derecho de la Sala: el contexto del problema seleccionado (ficha §2).
 *
 * ── LOS 3 BLOQUES DE LA FICHA, Y QUÉ PASÓ CON CADA UNO ────────────────────────────────────────
 *  1. **Otros problemas del vehículo** — ✅ se dibuja, con lo que hay: la intersección con la
 *     página cargada. No existe `GET /problemas?vehiculoId=` (B-17), así que la lista **se rotula**
 *     como de esta página. Decir "este vehículo tiene 2 problemas más" cuando tiene 7 y 5 están en
 *     otra página sería una afirmación falsa sobre el vehículo.
 *  2. **Stats de la regla en 30 días** (disparos / % sin acción / MTTR / falsos positivos) — ❌ no
 *     se dibuja. El vínculo problema → regla **no existe como columna** (PENDIENTE #8) y no hay
 *     endpoint de resumen (DA-PC-01): no hay ni de dónde sacar la regla, ni las métricas.
 *  3. **Patrón detectado** ("4 unidades con P0300 este mes") — ❌ no se dibuja. Es correlación entre
 *     vehículos, que ningún campo trae y que el motor no calcula.
 *
 * En su lugar entra lo que **sí** es real y auditable, y que la ficha pone en el ticket: el estado
 * en vivo del vehículo (partial-data de verdad) y el desglose de prioridad. Los 2 bloques son los
 * mismos componentes que usa el aside del ticket: es el mismo dato y tiene que leerse igual.
 */
export function PanelContextoProblema({
  detalle,
  cargando,
  problemasDeLaPagina,
}: {
  detalle: ProblemaOperativoDetalleDto | undefined
  cargando: boolean
  problemasDeLaPagina: readonly ProblemaOperativoListItemDto[]
}) {
  const { t } = useTranslation('flota')

  return (
    <aside
      aria-label={t('centro.sala.contexto.titulo')}
      className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-xl border border-borde bg-superficie-1 p-3 xl:w-72 xl:shrink-0"
    >
      <h2 className="text-sm font-semibold text-fg-primario">
        {t('centro.sala.contexto.titulo')}
      </h2>

      {cargando && detalle === undefined ? <Skeleton variante="linea" repetir={5} /> : null}

      {detalle === undefined ? null : (
        <>
          <EstadoEnVivoDelVehiculo detalle={detalle} />
          <DesgloseDePrioridad prioridad={detalle.prioridadDetalle} />
          <OtrosProblemas detalle={detalle} problemasDeLaPagina={problemasDeLaPagina} />
        </>
      )}
    </aside>
  )
}

function OtrosProblemas({
  detalle,
  problemasDeLaPagina,
}: {
  detalle: ProblemaOperativoDetalleDto
  problemasDeLaPagina: readonly ProblemaOperativoListItemDto[]
}) {
  const { t } = useTranslation('flota')

  if (detalle.vehiculo === null) return null

  const otros = otrosProblemasDelMismoVehiculo(problemasDeLaPagina, detalle)

  return (
    <BloqueDelCentro titulo={t('centro.sala.contexto.otrosDelVehiculo')}>
      {otros.length === 0 ? (
        <p className="text-xs text-fg-terciario">
          {t('centro.sala.contexto.otrosDelVehiculoVacio')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {otros.map((otro) => (
            <li key={otro.id} className="flex items-center gap-2 text-xs">
              <BadgeSeveridadProblema severidad={otro.severidad} />
              <span className="truncate text-fg-secundario">{otro.titulo}</span>
            </li>
          ))}
        </ul>
      )}

      {/* La lista es de la página cargada, no del vehículo: decirlo es lo que la hace verdadera. */}
      <p className="text-xs text-fg-terciario">
        {t('centro.sala.contexto.otrosDelVehiculoAclaracion')}
      </p>
    </BloqueDelCentro>
  )
}
