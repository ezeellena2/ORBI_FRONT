import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Boton } from '@/shared/ui/Boton'
import { Card } from '@/shared/ui/Card'
import type { VehiculoDetalleDto } from '@/services/contracts/flota'
import { BadgeConexion } from '../BadgeConexion'
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

      <TarjetaUbicacion vehiculo={vehiculo} />
    </div>
  )
}

/**
 * Lo que la ficha PUEDE afirmar sobre la ubicación, y nada más.
 *
 * ⚠️ CORRECCIÓN DE MENTIRA (verificación final de slice-05). Esta tarjeta dibujaba, para TODOS los
 * vehículos de TODAS las organizaciones y sin emitir un solo request, el literal *"Sin señal —
 * Todavía no hay datos de telemetría para este vehículo"*. Era cierto cuando se escribió (slice-02)
 * y dejó de serlo el 2026-08-12: `estado` y `ultimaSenal` **son campos del propio
 * `VehiculoDetalleDto`** y se componen desde Telemetría desde `f-03`. O sea que un vehículo que el
 * listado muestra "En línea · 45 km/h" abría su ficha y leía, en esta tarjeta, que no tenía datos de
 * telemetría. Es exactamente la mentira que `f-05` corrigió en la columna "Última señal" del
 * listado, cometida en la pantalla de al lado.
 *
 * Ahora la tarjeta se rinde con los campos que YA vienen en la respuesta del detalle —cero requests
 * nuevos, cero endpoints nuevos— y con el MISMO vocabulario que el badge del listado
 * (`BadgeConexion`), así que `sin_dato` sigue sin leerse como "desconectado" y arrastra su línea de
 * ayuda con las tres causas.
 *
 * ── LO QUE SIGUE SIN DIBUJARSE, Y NO ES UN OLVIDO ─────────────────────────────────────────────
 * El **mini-mapa** y la **dirección textual**. La posición sale de
 * `GET /api/flota/mapa/vehiculos/{id}/en-vivo` —que existe desde slice-05 `f-04`— y su superficie
 * contratada es el **mapa en vivo**, que es `f-08` y todavía no está montada (`/app/flota/mapa` cae
 * hoy en el placeholder "Próximamente" del `AppRouter`). Pedir el en-vivo acá para imprimir dos
 * coordenadas en texto sería inventarle una pantalla al dato. La dirección/barrio no tiene fuente en
 * ninguna capa (DA-MV-04).
 */
function TarjetaUbicacion({ vehiculo }: { vehiculo: VehiculoDetalleDto }) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  return (
    <Card titulo={t('flota:detalle.ubicacion.titulo')}>
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-borde bg-superficie-2 px-4 py-4">
        <BadgeConexion estado={vehiculo.estado} />

        <dl className="grid">
          <ParDato
            etiqueta={t('flota:detalle.ubicacion.ultimaSenal')}
            valor={formatearFechaHora(vehiculo.ultimaSenal?.fechaUtc, i18n.language)}
          />
        </dl>

        <p className="flex items-start gap-2 text-xs text-fg-terciario">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('flota:detalle.ubicacion.mapaPendiente')}
        </p>
      </div>

      <p className="mt-3 text-xs text-fg-terciario">
        {t('flota:detalle.ubicacion.enFlotaDesde', {
          fecha: formatearFecha(vehiculo.fechaCreacion, i18n.language),
        })}
      </p>

      <Boton
        variante="superficie"
        tamano="sm"
        anchoCompleto
        className="mt-3"
        render={<Link to={`/app/flota/mapa?vehicle=${vehiculo.id}`} />}
      >
        {t('flota:detalle.ubicacion.abrirMapa')}
      </Boton>
    </Card>
  )
}
