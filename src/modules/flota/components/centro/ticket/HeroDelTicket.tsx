import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { ProblemaOperativoDetalleDto } from '@/services/contracts/flota'
import {
  BarraDeAccionesProblema,
  type AccionDeMutacionProblema,
} from '../BarraDeAccionesProblema'
import { BadgeEstadoProblema, BadgeSeveridadProblema, BadgeSlaProblema } from '../BadgesDelCentro'
import { formatearFechaHora } from '../../detalle/formato'
import {
  descripcionDelVehiculo,
  patenteDelProblema,
} from '../../../vocabulario-sala-problemas'

/**
 * Hero del ticket (ficha §2): badges, título, meta con links y la barra de acciones.
 *
 * ── LO QUE EL HERO NO DIBUJA ──────────────────────────────────────────────────────────────────
 *  - **El código de la regla**: el vínculo problema → regla **no existe como columna**
 *    (PENDIENTE #8). Derivar un código del `tipo` sería fabricar trazabilidad.
 *  - **El badge `por vencer`**: el backend nunca emite `sla.estado = 'por_vencer'` porque ningún
 *    documento fija el umbral (DRIFT 5). Derivarlo de `minutosRestantes` sería inventar el mismo
 *    número en otro archivo.
 *  - **La prioridad como número suelto**: vive en el aside, con sus 7 factores al lado. Un `78`
 *    solo, sin el desglose, no se puede auditar — y encima puede no cuadrar con la suma (DRIFT 8).
 */
export function HeroDelTicket({
  detalle,
  onAccion,
}: {
  detalle: ProblemaOperativoDetalleDto
  onAccion: (accion: AccionDeMutacionProblema) => void
}) {
  const { t, i18n } = useTranslation('flota')

  return (
    <header className="flex flex-col gap-3 rounded-xl border border-borde bg-superficie-1 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <BadgeSeveridadProblema severidad={detalle.severidad} />
        <BadgeEstadoProblema estado={detalle.estado} />
        <BadgeSlaProblema sla={detalle.sla} />
      </div>

      <h1 className="text-xl font-semibold tracking-snug text-fg-primario">{detalle.titulo}</h1>

      <MetaDelTicket detalle={detalle} idioma={i18n.language} />

      <div className="border-t border-borde pt-3">
        <BarraDeAccionesProblema detalle={detalle} onAccion={onAccion} tamano="md" />
        {detalle.accionesDisponibles.length === 0 ? (
          <p className="text-xs text-fg-terciario">{t('centro.ticket.sinAcciones')}</p>
        ) : null}
      </div>
    </header>
  )
}

function MetaDelTicket({
  detalle,
  idioma,
}: {
  detalle: ProblemaOperativoDetalleDto
  idioma: string
}) {
  const { t } = useTranslation('flota')

  const patente = patenteDelProblema(detalle.vehiculo)
  const descripcion = descripcionDelVehiculo(detalle.vehiculo)

  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-fg-secundario">
      {detalle.vehiculo === null ? null : (
        <Dato etiqueta={t('centro.sala.detalle.vehiculo')}>
          <Link
            to={`/app/flota/vehiculos/${detalle.vehiculo.vehiculoFlotaId}`}
            className="font-mono text-marca hover:underline"
          >
            {patente ?? t('centro.sala.cola.sinPatente')}
          </Link>
          {descripcion === null ? null : <span> · {descripcion}</span>}
        </Dato>
      )}

      {detalle.conductor === null ? null : (
        <Dato etiqueta={t('centro.sala.detalle.conductor')}>
          <Link
            to={`/app/flota/conductores/${detalle.conductor.conductorFlotaId}`}
            className="text-marca hover:underline"
          >
            {detalle.conductor.nombreCompleto}
          </Link>
        </Dato>
      )}

      <Dato etiqueta={t('centro.sala.detalle.responsable')}>
        {detalle.responsable?.nombre ?? t('centro.sala.cola.sinResponsable')}
      </Dato>

      <Dato etiqueta={t('centro.sala.detalle.detectado')}>
        {formatearFechaHora(detalle.fechaDeteccionUtc, idioma)}
      </Dato>

      <Dato etiqueta={t('centro.ticket.actualizado')}>
        {formatearFechaHora(detalle.fechaActualizacionUtc, idioma)}
      </Dato>
    </dl>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <dt className="text-fg-terciario">{etiqueta}:</dt>
      <dd>{children}</dd>
    </div>
  )
}
