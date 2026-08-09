import { useTranslation } from 'react-i18next'
import type { VehiculoDetalleDto } from '@/services/contracts/flota'
import { SIN_DATO, formatearNumero } from './formato'

/**
 * Tira de 4 datos operativos del vehículo (NO es un muro de KPIs gerenciales: esos van solo al
 * dashboard b2b y a Reportes).
 *
 * DA-VD-01 SIGUE ABIERTA: el contrato no declara ningún endpoint de stats por vehículo, Telemetría
 * no expone histórico ni agregados y los trends del mockup ("↑ 8% vs ayer", "1 sin resolver") no
 * tienen fuente. Por eso tres de las cuatro degradan a `—` con su motivo escrito, en vez de simular
 * un número. El único valor con fuente real hoy es `kilometrajeActual`, que es dato propio de Flota.
 *
 * Cuando el PO cierre DA-VD-01 se reemplaza el `—` por el dato; hasta entonces mentir un valor sería
 * peor que no mostrarlo.
 */
export function MiniStatsVehiculo({ vehiculo }: { vehiculo: VehiculoDetalleDto }) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  const stats = [
    {
      clave: 'kmTotales',
      etiqueta: t('flota:detalle.miniStats.kmTotales'),
      valor: formatearNumero(vehiculo.kilometrajeActual, i18n.language),
      pista: t('flota:detalle.miniStats.pistaKmTotales'),
    },
    {
      clave: 'kmHoy',
      etiqueta: t('flota:detalle.miniStats.kmHoy'),
      valor: SIN_DATO,
      pista: t('flota:detalle.miniStats.sinFuente'),
    },
    {
      clave: 'consumo',
      etiqueta: t('flota:detalle.miniStats.consumo30d'),
      valor: SIN_DATO,
      pista: t('flota:detalle.miniStats.sinFuente'),
    },
    {
      clave: 'alertas',
      etiqueta: t('flota:detalle.miniStats.alertas30d'),
      valor: SIN_DATO,
      pista: t('flota:detalle.miniStats.sinFuente'),
    },
  ]

  return (
    <div
      role="group"
      aria-label={t('flota:detalle.miniStats.titulo')}
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {stats.map((stat) => (
        <div
          key={stat.clave}
          className="flex flex-col gap-1 rounded-lg border border-borde bg-superficie-1 px-4 py-3"
        >
          <span className="text-xs text-fg-secundario">{stat.etiqueta}</span>
          <span className="font-mono text-xl font-semibold text-fg-primario">{stat.valor}</span>
          <span className="text-xs text-fg-terciario">{stat.pista}</span>
        </div>
      ))}
    </div>
  )
}
