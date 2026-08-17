import { useTranslation } from 'react-i18next'
import { Clock, User } from 'lucide-react'
import { Icono } from '@/shared/ui/Icono'
import type { VehiculoDetalleDto } from '@/services/contracts/flota'
import { BadgeConexion } from '../BadgeConexion'
import { AccionesVehiculo } from './AccionesVehiculo'
import { SIN_DATO, componerSubtitulo, formatearFechaHora } from './formato'
import { claveDeTipoVehiculo } from './vocabulario'

/**
 * Encabezado de la ficha: patente + badge de conexión + subtítulo + meta-línea, y las acciones.
 *
 * ⚠️ DECISIÓN VENCIDA CORREGIDA. Este bloque decía *"Telemetría hoy no se compone (llega en
 * slice-05), así que `estado` vale `sin_dato` y `ultimaSenal` es `null`"*, y quedó FALSO el
 * 2026-08-12: `VehiculoFlotaService.ObtenerPorId` llama a `ObtenerEstadoDeUnVehiculo` y le pasa el
 * resultado a `MapearDetalle`, así que el `GET` de esta ficha trae `estado` y `ultimaSenal`
 * **reales**. El badge de acá pinta un dato vivo, no un placeholder.
 *
 * ── POR QUÉ EL BADGE ES `BadgeConexion` Y NO UN `Badge` SUELTO ────────────────────────────────
 * Tenía su propia composición: variante + etiqueta, **sin la línea de ayuda**. O sea que la ficha
 * —el lugar al que entra el operador justamente cuando algo le llama la atención— era la única
 * superficie donde "Sin dato" aparecía SOLO, sin nada que dijera que no es una desconexión. En los
 * listados el badge sí lo explica. `sin_dato` es ausencia de fila upstream (nunca reportó · no
 * tiene GPS · Telemetría no respondió, y ahí caen TODOS de golpe); `desconectado` es una afirmación
 * del upstream. La etiqueta sola no alcanza para distinguirlos.
 *
 * PARTIAL-DATA (capa (a) de D-C1): si Telemetría no responde, `estado` vale `sin_dato` y
 * `ultimaSenal` es `null` — y lo propio de Flota (patente, marca, conductor principal) se sigue
 * viendo entero. Nunca se inventa una velocidad ni una dirección, y la pantalla no se rompe.
 *
 * La identidad canónica también es nullable: si la proyección no está vigente, `patente` llega en
 * `null` y el hero cae al alias o al marcador de dato ausente en vez de imprimir "null".
 */
export function HeroVehiculo({
  vehiculo,
  identidadConductorDeSesion,
  onEditar,
  onDarDeBaja,
  onCambiarDispositivo,
  onGestionarConductores,
}: {
  vehiculo: VehiculoDetalleDto
  /**
   * Identidad del conductor asignado en ESTA sesión, si lo hubo. Es lo único que la ficha puede
   * afirmar sobre el conductor mientras `conductorPrincipal` no se componga.
   */
  identidadConductorDeSesion: string | null
  onEditar: () => void
  onDarDeBaja: () => void
  onCambiarDispositivo: () => void
  onGestionarConductores: () => void
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
          <BadgeConexion estado={vehiculo.estado} />
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
          {/*
            🔴 CORRECCIÓN DE MENTIRA (f-07). Acá decía `?? t('detalle.sinConductor')`, o sea
            "Sin conductor asignado" — y `conductorPrincipal` viene `null` en el 100% de las
            respuestas, también con conductor asignado (composición faltante; ⚠️ **NO es de
            slice-05**, que cerró el 2026-08-12 sin tomarla: es intra-schema y su dueño es el PO).
            O sea que la
            meta-línea del hero AFIRMABA, en todos los vehículos de todas las organizaciones, algo que
            Flota no puede saber. Ahora cae al marcador de dato ausente, salvo que la asignación se
            haya hecho en esta sesión: eso sí consta.
          */}
          <span className="inline-flex items-center gap-1.5">
            <Icono icono={User} tamano="xs" />
            {vehiculo.conductorPrincipal?.nombreCompleto ??
              identidadConductorDeSesion ??
              t('flota:detalle.conductorNoDisponible')}
          </span>
        </div>
      </div>

      <AccionesVehiculo
        vehiculoFlotaId={vehiculo.id}
        onEditar={onEditar}
        onDarDeBaja={onDarDeBaja}
        onCambiarDispositivo={onCambiarDispositivo}
        onGestionarConductores={onGestionarConductores}
      />
    </section>
  )
}
