import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CarFront } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Boton } from '@/shared/ui/Boton'
import { Card } from '@/shared/ui/Card'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import type { DispositivoDetalleDto } from '@/services/contracts/flota'
import { ParDato } from '../../detalle/ParDato'
import { formatearFecha, formatearFechaHora } from '../../detalle/formato'
import { usePermisos } from '../../../hooks/usePermisos'
import { claveDeStock, varianteDeStock } from './vocabulario-stock'

/**
 * Tab por defecto: los datos propios de Flota + la identidad tecnica READ-ONLY.
 *
 * "Identidad tecnica" ya NO es sinonimo de "proyectada del canonico", y el comentario que lo decia
 * quedo una decision atras: de los 3 campos, solo el **IMEI** viene del canonico. `numeroSerie` es
 * columna propia desde **D-S3-24** y `fabricante` se deriva del catalogo de modelos (**D-S3-25**).
 * Son read-only porque el PATCH no los expone, no porque Flota no los posea.
 *
 * La ficha pide tambien "Ultima posicion" en un mini-mapa Leaflet: NO se renderiza en este slice.
 * La posicion es del vehiculo correlacionado y sale de la composicion con Telemetria, que llega en
 * slice-05; un mapa centrado en una coordenada inventada es peor que ningun mapa.
 *
 * `ultimaSenal` tampoco se renderiza aunque el DTO lo exponga: **D-S3-27** lo saco de la proyeccion
 * persistida (la columna no tenia escritor) y lo movio a la composicion con Telemetria al leer, que
 * llega en slice-05. Hasta entonces viaja `null` por contrato — un par de dato que muestra su
 * fallback para siempre no informa, informa la ausencia de la integracion.
 */
export function TabInfoDispositivo({ dispositivo }: { dispositivo: DispositivoDetalleDto }) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  // Los nombres de los auditores llegan RESUELTOS en el DTO (`creadoPorNombre`), no como ids. Cuando
  // la proyeccion usuario->persona no los tiene, se muestra la fecha sola en vez de "por null".
  const autoria = (fecha: string | null, nombre: string | null) => {
    const cuando = formatearFechaHora(fecha, i18n.language)
    return nombre === null ? cuando : t('flota:dispositivoDetalle.info.porUsuario', { cuando, nombre })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card titulo={t('flota:dispositivoDetalle.info.titulo')}>
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <ParDato etiqueta={t('flota:dispositivoDetalle.info.alias')} valor={dispositivo.alias} />
          <ParDato etiqueta={t('flota:dispositivoDetalle.info.imei')} valor={dispositivo.imei} mono />
          <ParDato
            etiqueta={t('flota:dispositivoDetalle.info.modelo')}
            valor={dispositivo.modeloNombre}
          />
          <ParDato
            etiqueta={t('flota:dispositivoDetalle.info.fabricante')}
            valor={dispositivo.fabricante}
          />
          <ParDato
            etiqueta={t('flota:dispositivoDetalle.info.numeroSerie')}
            valor={dispositivo.numeroSerie}
            mono
          />
          <ParDato
            etiqueta={t('flota:dispositivoDetalle.info.firmware')}
            valor={dispositivo.firmwareVersion}
            mono
          />
          <ParDato
            etiqueta={t('flota:dispositivoDetalle.info.sim')}
            valor={dispositivo.numeroSim}
            mono
          />
          <ParDato
            etiqueta={t('flota:dispositivoDetalle.info.proveedorSim')}
            valor={dispositivo.proveedorSimNombre}
          />
          <ParDato
            etiqueta={t('flota:dispositivoDetalle.info.estadoStock')}
            valor={
              <Badge variante={varianteDeStock(dispositivo.estadoOperativo)}>
                {t(`flota:${claveDeStock(dispositivo.estadoOperativo)}`)}
              </Badge>
            }
          />
          <ParDato
            etiqueta={t('flota:dispositivoDetalle.info.estado')}
            valor={
              <Badge variante={dispositivo.activo ? 'exito' : 'neutro'}>
                {dispositivo.activo
                  ? t('flota:estadoActivo.activo')
                  : t('flota:estadoActivo.deBaja')}
              </Badge>
            }
          />
          {/*
            "Costo de adquisicion" y "Ubicacion en deposito" SE BORRARON del contrato (D-S3-12): no
            existian las columnas, asi que estos 2 pares mostraban su fallback para siempre.
          */}
          <ParDato
            etiqueta={t('flota:dispositivoDetalle.info.ingresoAlStock')}
            valor={autoria(dispositivo.fechaAltaOperativa, dispositivo.creadoPorNombre)}
          />
          <ParDato
            etiqueta={t('flota:dispositivoDetalle.info.modificado')}
            valor={autoria(dispositivo.fechaActualizacion, dispositivo.modificadoPorNombre)}
          />
        </dl>

        {dispositivo.notasOperativas === null ? null : (
          <div className="mt-4 flex flex-col gap-1">
            <span className="text-xs text-fg-secundario">
              {t('flota:dispositivoDetalle.info.notas')}
            </span>
            <p className="text-sm whitespace-pre-line text-fg-primario">
              {dispositivo.notasOperativas}
            </p>
          </div>
        )}
      </Card>

      <TarjetaVehiculoAsociado dispositivo={dispositivo} />
    </div>
  )
}

/**
 * "Vehiculo asociado" — la card que tiene EMPTY PROPIO (§9: el detalle no tiene empty global, los
 * empties son por sub-seccion).
 *
 * Con vehiculo: patente + desde cuando esta instalado + CTA a la ficha del vehiculo.
 * Sin vehiculo: "Sin vehiculo asociado" + CTA para asociarlo, solo con
 * `flota.vehiculos.asignar-dispositivo`.
 *
 * DA-DD-04 SIGUE ABIERTA (copy y medio del CTA: link a la ficha del vehiculo vs. modal de asociacion
 * inversa). El paso de build resuelve la ambiguedad de la forma conservadora: se usa el LINK, no se
 * inventa un modal nuevo. Como todavia no hay un vehiculo elegido, el link va al listado de
 * vehiculos, que es donde se elige la unidad y se asocia desde su ficha.
 *
 * "Instalado desde" sale de la asignacion VIGENTE de `historialAsignaciones[]` (la que tiene
 * `fechaDesasignacion === null`), que es como la ficha lo define: derivado, no un campo propio.
 */
function TarjetaVehiculoAsociado({ dispositivo }: { dispositivo: DispositivoDetalleDto }) {
  const { t, i18n } = useTranslation(['flota', 'common'])
  const { tienePermiso } = usePermisos()

  if (dispositivo.vehiculoInstalado === null) {
    return (
      <Card titulo={t('flota:dispositivoDetalle.vehiculo.titulo')}>
        <EstadoVacio
          variante="sin-datos"
          icono={CarFront}
          titulo={t('flota:dispositivoDetalle.vehiculo.vacioTitulo')}
          descripcion={t('flota:dispositivoDetalle.vehiculo.vacioDescripcion')}
          acciones={
            tienePermiso('flota.vehiculos.asignar-dispositivo') ? (
              <Boton
                variante="secundaria"
                tamano="sm"
                render={<Link to="/app/flota/vehiculos" />}
              >
                {t('flota:dispositivoDetalle.vehiculo.asociar')}
              </Boton>
            ) : undefined
          }
        />
      </Card>
    )
  }

  const vigente = dispositivo.historialAsignaciones.find(
    (asignacion) => asignacion.fechaDesasignacion === null,
  )

  return (
    <Card titulo={t('flota:dispositivoDetalle.vehiculo.titulo')}>
      <dl className="grid gap-x-8">
        <ParDato
          etiqueta={t('flota:dispositivoDetalle.vehiculo.patente')}
          valor={dispositivo.vehiculoInstalado.patente}
          mono
        />
        <ParDato
          etiqueta={t('flota:dispositivoDetalle.vehiculo.instaladoDesde')}
          valor={
            vigente === undefined ? null : formatearFecha(vigente.fechaAsignacion, i18n.language)
          }
        />
      </dl>

      <Boton
        variante="superficie"
        tamano="sm"
        anchoCompleto
        className="mt-3"
        render={
          <Link to={`/app/flota/vehiculos/${dispositivo.vehiculoInstalado.vehiculoFlotaId}`} />
        }
      >
        {t('flota:dispositivoDetalle.vehiculo.verFicha')}
      </Boton>
    </Card>
  )
}
