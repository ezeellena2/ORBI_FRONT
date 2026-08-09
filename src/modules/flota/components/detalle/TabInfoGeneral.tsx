import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Boton } from '@/shared/ui/Boton'
import { Card } from '@/shared/ui/Card'
import type { VehiculoDetalleDto } from '@/services/contracts/flota'
import { ParDato } from './ParDato'
import { formatearFecha, formatearFechaHora, formatearNumero } from './formato'
import { claveDeEstadoOperativo, claveDeTipoVehiculo, varianteDeEstadoOperativo } from './vocabulario'

/**
 * Tab por defecto: los datos propios de Flota + la identidad canónica proyectada, READ-ONLY.
 *
 * `combustible` NO se renderiza aunque el DTO lo exponga: sigue PENDIENTE (C-6) y el backend lo
 * sirve siempre `null`. Un campo que nunca va a tener valor es ruido, no información.
 *
 * `creadoPorNombre` / `modificadoPorNombre` hoy llegan siempre `null` (la proyección
 * usuario→persona no existe todavía): se muestra la fecha sola en vez de "por null".
 */
export function TabInfoGeneral({ vehiculo }: { vehiculo: VehiculoDetalleDto }) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  const autoria = (fecha: string | null, nombre: string | null) => {
    const cuando = formatearFechaHora(fecha, i18n.language)
    return nombre === null ? cuando : t('flota:detalle.info.porUsuario', { cuando, nombre })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card titulo={t('flota:detalle.info.titulo')}>
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <ParDato etiqueta={t('flota:detalle.info.patente')} valor={vehiculo.patente} mono />
          <ParDato
            etiqueta={t('flota:detalle.info.tipo')}
            valor={
              vehiculo.tipo === null
                ? null
                : t(`flota:${claveDeTipoVehiculo(vehiculo.tipo)}`, { defaultValue: vehiculo.tipo })
            }
          />
          <ParDato etiqueta={t('flota:detalle.info.marca')} valor={vehiculo.marca} />
          <ParDato etiqueta={t('flota:detalle.info.modelo')} valor={vehiculo.modelo} />
          <ParDato etiqueta={t('flota:detalle.info.anio')} valor={vehiculo.anio} mono />
          <ParDato etiqueta={t('flota:detalle.info.color')} valor={vehiculo.color} />
          <ParDato etiqueta={t('flota:detalle.info.vin')} valor={vehiculo.vin} mono />
          <ParDato etiqueta={t('flota:detalle.info.alias')} valor={vehiculo.alias} />
          <ParDato
            etiqueta={t('flota:detalle.info.kilometraje')}
            valor={
              vehiculo.kilometrajeActual === null
                ? null
                : t('flota:detalle.info.kilometros', {
                    valor: formatearNumero(vehiculo.kilometrajeActual, i18n.language),
                  })
            }
            mono
          />
          <ParDato
            etiqueta={t('flota:detalle.info.estadoOperativo')}
            valor={
              <Badge variante={varianteDeEstadoOperativo(vehiculo.estadoOperativo)}>
                {t(`flota:${claveDeEstadoOperativo(vehiculo.estadoOperativo)}`)}
              </Badge>
            }
          />
          <ParDato
            etiqueta={t('flota:detalle.info.estado')}
            valor={
              <Badge variante={vehiculo.activo ? 'exito' : 'neutro'}>
                {vehiculo.activo
                  ? t('flota:estadoActivo.activo')
                  : t('flota:estadoActivo.deBaja')}
              </Badge>
            }
          />
          <ParDato
            etiqueta={t('flota:detalle.info.creado')}
            valor={autoria(vehiculo.fechaCreacion, vehiculo.creadoPorNombre)}
          />
          <ParDato
            etiqueta={t('flota:detalle.info.modificado')}
            valor={autoria(vehiculo.fechaActualizacion, vehiculo.modificadoPorNombre)}
          />
        </dl>

        {vehiculo.notasOperativas === null ? null : (
          <div className="mt-4 flex flex-col gap-1">
            <span className="text-xs text-fg-secundario">{t('flota:detalle.info.notas')}</span>
            <p className="text-sm whitespace-pre-line text-fg-primario">
              {vehiculo.notasOperativas}
            </p>
          </div>
        )}
      </Card>

      <TarjetaUbicacion vehiculoFlotaId={vehiculo.id} desde={vehiculo.fechaCreacion} />
    </div>
  )
}

/**
 * PARTIAL-DATA declarado. El mini-mapa Leaflet y la dirección salen de la composición con
 * Telemetría, que entra en slice-05: hoy la tarjeta muestra su placeholder "Sin señal" con el motivo
 * y el deep-link al mapa completo. No se dibuja un mapa vacío centrado en una coordenada inventada.
 */
function TarjetaUbicacion({
  vehiculoFlotaId,
  desde,
}: {
  vehiculoFlotaId: string
  desde: string
}) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  return (
    <Card titulo={t('flota:detalle.ubicacion.titulo')}>
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-borde bg-superficie-2 px-4 py-10 text-center">
        <MapPin className="size-6 text-fg-terciario" aria-hidden />
        <p className="text-sm font-medium text-fg-primario">
          {t('flota:detalle.ubicacion.sinSenal')}
        </p>
        <p className="text-xs text-fg-secundario">
          {t('flota:detalle.ubicacion.sinSenalDescripcion')}
        </p>
      </div>

      <p className="mt-3 text-xs text-fg-terciario">
        {t('flota:detalle.ubicacion.enFlotaDesde', {
          fecha: formatearFecha(desde, i18n.language),
        })}
      </p>

      <Boton
        variante="superficie"
        tamano="sm"
        anchoCompleto
        className="mt-3"
        render={<Link to={`/app/flota/mapa?vehicle=${vehiculoFlotaId}`} />}
      >
        {t('flota:detalle.ubicacion.abrirMapa')}
      </Boton>
    </Card>
  )
}
