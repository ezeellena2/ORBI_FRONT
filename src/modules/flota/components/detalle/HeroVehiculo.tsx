import { useTranslation } from 'react-i18next'
import { Clock, User } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Icono } from '@/shared/ui/Icono'
import type { VehiculoDetalleDto } from '@/services/contracts/flota'
import { AccionesVehiculo } from './AccionesVehiculo'
import { SIN_DATO, componerSubtitulo, formatearFechaHora } from './formato'
import { claveDeConexion, claveDeTipoVehiculo, varianteDeConexion } from './vocabulario'

/**
 * Encabezado de la ficha: patente + badge de conexión + subtítulo + meta-línea, y las acciones.
 *
 * PARTIAL-DATA (capa (a) de D-C1) — es el punto más visible de la pantalla. Telemetría hoy no se
 * compone (llega en slice-05), así que `estado` vale `sin_dato` y `ultimaSenal` es `null`: el badge
 * muestra "Sin datos de telemetría" y la última señal muestra `—`. Lo propio de Flota (patente,
 * marca, conductor principal) se sigue viendo entero. Nunca se inventa una velocidad ni una
 * dirección, y la pantalla no se rompe.
 *
 * La identidad canónica también es nullable: si la proyección no está vigente, `patente` llega en
 * `null` y el hero cae al alias o al marcador de dato ausente en vez de imprimir "null".
 */
export function HeroVehiculo({
  vehiculo,
  onEditar,
  onDarDeBaja,
}: {
  vehiculo: VehiculoDetalleDto
  onEditar: () => void
  onDarDeBaja: () => void
}) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  const tipo =
    vehiculo.tipo === null
      ? null
      : t(`flota:${claveDeTipoVehiculo(vehiculo.tipo)}`, { defaultValue: vehiculo.tipo })

  // "Ford Transit 2024" va junto; el resto se separa con puntos medios.
  const identidad = [vehiculo.marca, vehiculo.modelo, vehiculo.anio]
    .filter((parte) => parte !== null)
    .join(' ')

  const subtitulo = componerSubtitulo([identidad, tipo, vehiculo.color])

  return (
    <section className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-borde bg-superficie-1 p-5">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-wide text-fg-primario">
            {vehiculo.patente ?? vehiculo.alias ?? SIN_DATO}
          </h1>
          <Badge punto variante={varianteDeConexion(vehiculo.estado)}>
            {t(`flota:${claveDeConexion(vehiculo.estado)}`)}
          </Badge>
        </div>

        <p className="text-sm text-fg-secundario">
          {subtitulo ?? t('flota:detalle.identidadNoDisponible')}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-terciario">
          <span className="inline-flex items-center gap-1.5">
            <Icono icono={Clock} tamano="xs" />
            {t('flota:detalle.ultimaSenal', {
              valor: formatearFechaHora(vehiculo.ultimaSenal?.fechaUtc, i18n.language),
            })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icono icono={User} tamano="xs" />
            {vehiculo.conductorPrincipal?.nombreCompleto ?? t('flota:detalle.sinConductor')}
          </span>
        </div>
      </div>

      <AccionesVehiculo
        vehiculoFlotaId={vehiculo.id}
        onEditar={onEditar}
        onDarDeBaja={onDarDeBaja}
      />
    </section>
  )
}
