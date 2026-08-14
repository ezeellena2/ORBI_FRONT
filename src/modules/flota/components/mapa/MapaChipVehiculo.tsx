import { useTranslation } from 'react-i18next'
import { BadgeConexion } from '../BadgeConexion'
import { antiguedadDeLaSenal, puedeMostrarVelocidad } from '../../vocabulario-mapa'
import { SIN_DATO } from '../detalle/formato'
import type { MapaItemDto } from '@/services/contracts/flota'
import { cn } from '@/shared/utils/cn'

/**
 * Una fila del panel izquierdo. Es un `<button>` de verdad, no un `div` con `onClick`: **este es el
 * camino accesible del mapa** (un marcador de Leaflet no puede serlo), asi que tiene que ser
 * navegable por teclado y anunciable por un lector de pantalla.
 *
 * ── LO QUE EL CHIP DEL MOCKUP MUESTRA Y ESTE NO ───────────────────────────────────────────────
 *  - **Ubicacion textual** ("Av. Corrientes 1234"): el geocoding inverso coordenada→direccion no
 *    tiene dueño ni proveedor (**DA-MV-04**). El mockup la escribe a mano.
 *  - **"⚠ Fuera de geocerca"**: geozonas esta DIFERIDO (DA-08).
 * Lo que si esta es lo unico que el contrato garantiza: patente, modelo, conductor, estado de
 * conexion, velocidad (cuando se puede afirmar) y antiguedad de la ultima posicion.
 */

export interface MapaChipVehiculoProps {
  item: MapaItemDto
  seleccionado: boolean
  onSeleccionar: (vehiculoFlotaId: string) => void
  /** Instante de referencia para la antiguedad. Lo pasa el panel: una sola lectura del reloj. */
  ahoraMs: number
}

export function MapaChipVehiculo({
  item,
  seleccionado,
  onSeleccionar,
  ahoraMs,
}: MapaChipVehiculoProps) {
  const { t, i18n } = useTranslation('flota')

  const antiguedad = antiguedadDeLaSenal(item.ubicacion.fechaUtc, ahoraMs)
  const relativo =
    antiguedad === null
      ? SIN_DATO
      : new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto', style: 'narrow' }).format(
          -antiguedad.cantidad,
          antiguedad.unidad,
        )

  /*
    La velocidad se concatena al badge SOLO con `en_linea`. Con `desconectado` el numero existe pero
    es viejo —el equipo dejo de reportar— y "Desconectado · 45 km/h" presenta como actual la ultima
    velocidad conocida. Con `sin_dato` ni siquiera hubo fila upstream, que es ademas el estado con el
    que se sirve una posicion sacada de la cache.
  */
  const velocidad = puedeMostrarVelocidad(item.estado)
    ? t('mapa.unidades.kmh', { valor: Math.round(item.velocidadKmH) })
    : null

  return (
    <button
      type="button"
      aria-pressed={seleccionado}
      onClick={() => onSeleccionar(item.vehiculoFlotaId)}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-foco/35',
        seleccionado
          ? 'border-marca bg-marca-tenue'
          : 'border-transparent bg-superficie-2 hover:border-borde-hover',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-mono text-sm font-semibold text-fg-primario">
            {item.patente ?? t('mapa.sinPatente')}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-fg-terciario">{relativo}</span>
        </div>

        <span className="truncate text-xs text-fg-secundario">
          {item.modelo ?? SIN_DATO}
          {' · '}
          {item.conductorAsignado === null
            ? t('mapa.chip.sinConductor')
            : (item.conductorAsignado.nombreCompleto ?? t('mapa.chip.conductorSinNombre'))}
        </span>

        <BadgeConexion estado={item.estado} sufijo={velocidad} />
      </div>
    </button>
  )
}
