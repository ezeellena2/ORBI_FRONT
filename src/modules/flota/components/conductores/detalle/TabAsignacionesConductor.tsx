import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Smartphone, Truck } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Boton } from '@/shared/ui/Boton'
import { Card } from '@/shared/ui/Card'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Paginacion } from '@/shared/ui/Paginacion'
import { Tabla } from '@/shared/ui/Tabla'
import type { Columna } from '@/shared/ui/Columna'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type {
  AsignacionConductorHistorialDto,
  ConductorDetalleDto,
  DispositivoAsignadoConductorDto,
  HistorialConductorQuery,
  VehiculoAsignadoConductorDto,
} from '@/services/contracts/flota'
import { AccionConMotivo } from '../../AccionConMotivo'
import { useAsignacionesConductor } from '../../../hooks/useAsignacionesConductor'
import { usePermisos } from '../../../hooks/usePermisos'
import { formatearFecha } from '../../detalle/formato'

/**
 * Tab "Asignaciones" de la ficha del conductor (`f-06` §5): vehiculo vigente + dispositivos
 * vinculados + historial paginado.
 *
 * ── DE DONDE SALE EL `asignacionId`, QUE ES LA PARTE FRAGIL ───────────────────────────────────
 * El `DELETE` de la asignacion vehiculo↔conductor lo pide en la URL, y del lado del VEHICULO no hay
 * ninguna lectura que lo exponga: `GET /vehiculos/{id}/asignaciones` **no esta implementado** (B-19)
 * y `VehiculoDetalleDto.conductoresAsignados` viene vacio siempre. La UNICA fuente es
 * `GET /conductores/{id}/asignaciones` — o sea la tabla de mas abajo de este mismo tab.
 *
 * Por eso "Quitar" se resuelve **cruzando** la tarjeta del vehiculo con el historial cargado: si la
 * asignacion vigente esta en la pagina que se esta viendo, el boton funciona; si no (esta en otra
 * pagina del historial), queda **deshabilitado CON EL MOTIVO VISIBLE**, nunca ausente y nunca
 * habilitado "a ver si anda".
 *
 * ── EL BADGE "EN LINEA" NO SE PINTA ───────────────────────────────────────────────────────────
 * Es composicion con Telemetria (slice-05). El fallback de la ficha es explicito y **no se dibuja un
 * badge gris permanente**: un badge que siempre dice lo mismo entrena al usuario a ignorar el lugar
 * donde despues va a aparecer el dato real.
 */

export const PAGE_SIZE_HISTORIAL_CONDUCTOR = 10

export interface TabAsignacionesConductorProps {
  conductor: ConductorDetalleDto
  page: number
  pageSize: number
  onPaginacion: (page: number, pageSize: number) => void
  onAsignarVehiculo: () => void
  onVincularDispositivo: () => void
  onDesasignarVehiculo: (asignacion: AsignacionConductorHistorialDto) => void
  onDesvincularDispositivo: (asignacionId: string) => void
}

export function TabAsignacionesConductor({
  conductor,
  page,
  pageSize,
  onPaginacion,
  onAsignarVehiculo,
  onVincularDispositivo,
  onDesasignarVehiculo,
  onDesvincularDispositivo,
}: TabAsignacionesConductorProps) {
  const { t } = useTranslation(['flota', 'common'])
  const { tienePermiso } = usePermisos()

  const puedeAsignarVehiculo = tienePermiso('flota.vehiculos.asignar-conductor')
  const puedeAsignarDispositivo = tienePermiso('flota.conductores.asignar-dispositivo')

  // La query se arma acá con primitivas, no con un objeto del padre: tiene que ser estable POR VALOR
  // entre renders o React Query dispara una query nueva por render (regla de `query-keys.ts`).
  const query: HistorialConductorQuery = { page, pageSize }
  const historial = useAsignacionesConductor(conductor.id, query)

  const vehiculoVigente = conductor.vehiculosAsignados.at(0) ?? null

  /*
    ⚠️ EL EMPAREJAMIENTO ES POR ID, NO POSICIONAL.
    Un `find(item => item.fechaFin === null)` a secas devuelve **la primera fila abierta de la página
    del historial que se esté viendo**, que no tiene por qué ser la del vehículo que pinta la
    tarjeta: un conductor puede tener 2 asignaciones vigentes (el índice único parcial del backend es
    por VEHICULO —`ux_asig_veh_cond_principal_abierta`—, no por conductor). Con el usuario en la
    página ≥2 del historial, "Quitar" armaba la URL con el `vehiculoFlotaId` de la fila equivocada y
    cerraba **otra** asignación, con 204.
  */
  const vigenteEnHistorial =
    vehiculoVigente === null
      ? null
      : (historial.data?.items.find(
          (item) =>
            item.fechaFin === null &&
            item.vehiculoFlotaId === vehiculoVigente.vehiculoFlotaId,
        ) ?? null)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <TarjetaVehiculo
          vehiculo={vehiculoVigente}
          otrosVigentes={Math.max(conductor.vehiculosAsignados.length - 1, 0)}
          vigenteEnHistorial={vigenteEnHistorial}
          puedeAsignar={puedeAsignarVehiculo}
          onAsignar={onAsignarVehiculo}
          onDesasignar={onDesasignarVehiculo}
        />

        <TarjetaDispositivos
          dispositivos={conductor.dispositivosAsignados.filter((item) => item.activa)}
          puedeAsignar={puedeAsignarDispositivo}
          onVincular={onVincularDispositivo}
          onDesvincular={onDesvincularDispositivo}
        />
      </div>

      <Card titulo={t('flota:conductorDetalle.asignaciones.historialTitulo')}>
        <TablaHistorial
          items={historial.data?.items ?? []}
          cargando={historial.isPending}
          error={
            historial.isError ? (
              <EstadoError
                variante="recuperable"
                titulo={t('flota:conductorDetalle.asignaciones.historialErrorTitulo')}
                mensaje={resolveApiErrorMessage(parseApiError(historial.error), t)}
                textoReintentar={t('flota:comun.reintentar')}
                onReintentar={() => void historial.refetch()}
              />
            ) : undefined
          }
        />

        {historial.data && historial.data.pagination.totalItems > 0 ? (
          <div className="pt-3">
            <Paginacion
              variante="compacta"
              pagina={historial.data.pagination.page}
              tamanoPagina={historial.data.pagination.pageSize}
              total={historial.data.pagination.totalItems}
              opcionesTamano={[PAGE_SIZE_HISTORIAL_CONDUCTOR, 25, 50]}
              deshabilitada={historial.isFetching}
              onCambio={(cambio) => onPaginacion(cambio.pagina, cambio.tamanoPagina)}
              textos={{
                anterior: t('flota:conductoresListado.paginacion.anterior'),
                siguiente: t('flota:conductoresListado.paginacion.siguiente'),
                porPagina: t('flota:conductoresListado.paginacion.porPagina'),
                rango: (desde, hasta, total) =>
                  t('flota:conductoresListado.paginacion.rango', { desde, hasta, total }),
              }}
            />
          </div>
        ) : null}
      </Card>
    </div>
  )
}

function TarjetaVehiculo({
  vehiculo,
  otrosVigentes,
  vigenteEnHistorial,
  puedeAsignar,
  onAsignar,
  onDesasignar,
}: {
  vehiculo: VehiculoAsignadoConductorDto | null
  /** Cuántas asignaciones vigentes MÁS tiene el conductor, que esta tarjeta no muestra. */
  otrosVigentes: number
  vigenteEnHistorial: AsignacionConductorHistorialDto | null
  puedeAsignar: boolean
  onAsignar: () => void
  onDesasignar: (asignacion: AsignacionConductorHistorialDto) => void
}) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  const motivoAsignar = puedeAsignar
    ? undefined
    : t('flota:conductorDetalle.acciones.sinPermiso', {
        permiso: 'flota.vehiculos.asignar-conductor',
      })

  if (vehiculo === null) {
    return (
      <Card titulo={t('flota:conductorDetalle.asignaciones.vehiculoTitulo')}>
        <EstadoVacio
          variante="sin-datos"
          icono={Truck}
          titulo={t('flota:conductorDetalle.asignaciones.vehiculoVacioTitulo')}
          descripcion={t('flota:conductorDetalle.asignaciones.vehiculoVacioDescripcion')}
          acciones={
            <AccionConMotivo motivo={motivoAsignar}>
              <Boton variante="secundaria" deshabilitado={!puedeAsignar} onClick={onAsignar}>
                {t('flota:conductorDetalle.asignaciones.asignarVehiculo')}
              </Boton>
            </AccionConMotivo>
          }
        />
      </Card>
    )
  }

  // Sin la asignacion en el historial cargado no hay `asignacionId`, y sin el la URL del `DELETE` no
  // se puede construir. El boton queda deshabilitado con su motivo, que dice donde encontrarlo.
  const motivoQuitar =
    motivoAsignar ??
    (vigenteEnHistorial === null
      ? t('flota:conductorDetalle.asignaciones.desasignarSinId')
      : undefined)

  return (
    <Card titulo={t('flota:conductorDetalle.asignaciones.vehiculoTitulo')}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/*
            `patente` es nullable y el fallback NO puede ser el id: pintar `v-2` en la misma
            tipografía monoespaciada que una patente real lo hace pasar por patente. Se dice
            "Sin patente" y el enlace sigue teniendo texto.
          */}
          <Link
            to={`/app/flota/vehiculos/${vehiculo.vehiculoFlotaId}`}
            className={
              vehiculo.patente === null
                ? 'rounded-sm text-lg text-marca underline-offset-4 hover:underline'
                : 'rounded-sm font-mono text-lg tracking-wide text-marca underline-offset-4 hover:underline'
            }
          >
            {vehiculo.patente ?? t('flota:asignacionVehiculo.sinPatente')}
          </Link>
          <Badge variante={vehiculo.rol === 'principal' ? 'accion' : 'neutro'}>
            {t(`flota:rolConductor.${vehiculo.rol}`, { defaultValue: vehiculo.rol })}
          </Badge>
        </div>

        {/*
          Un conductor puede tener más de una asignación vigente (el índice único del backend es por
          vehículo, no por conductor). La tarjeta muestra la primera: decirlo evita que la ficha
          contradiga en silencio al listado, que sí pinta el conteo completo.
        */}
        {otrosVigentes > 0 ? (
          <p className="text-xs text-fg-terciario">
            {t('flota:conductorDetalle.asignaciones.masVigentes', { count: otrosVigentes })}
          </p>
        ) : null}

        <p className="text-xs text-fg-secundario">
          {t('flota:conductorDetalle.asignaciones.desde')}{' '}
          {formatearFecha(vehiculo.fechaAsignacion, i18n.language)}
        </p>

        <div className="flex flex-wrap gap-2">
          <Boton
            variante="secundaria"
            tamano="sm"
            render={<Link to={`/app/flota/vehiculos/${vehiculo.vehiculoFlotaId}`} />}
          >
            {t('flota:conductorDetalle.asignaciones.verVehiculo')}
          </Boton>

          <AccionConMotivo motivo={motivoQuitar}>
            <Boton
              variante="fantasma"
              tamano="sm"
              deshabilitado={motivoQuitar !== undefined}
              onClick={() => {
                if (vigenteEnHistorial === null) return
                onDesasignar(vigenteEnHistorial)
              }}
            >
              {t('flota:conductorDetalle.asignaciones.desasignar')}
            </Boton>
          </AccionConMotivo>
        </div>
      </div>
    </Card>
  )
}

function TarjetaDispositivos({
  dispositivos,
  puedeAsignar,
  onVincular,
  onDesvincular,
}: {
  dispositivos: DispositivoAsignadoConductorDto[]
  puedeAsignar: boolean
  onVincular: () => void
  onDesvincular: (asignacionId: string) => void
}) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  const motivo = puedeAsignar
    ? undefined
    : t('flota:conductorDetalle.acciones.sinPermiso', {
        permiso: 'flota.conductores.asignar-dispositivo',
      })

  const cta = (
    <AccionConMotivo motivo={motivo}>
      <Boton variante="secundaria" tamano="sm" deshabilitado={!puedeAsignar} onClick={onVincular}>
        {t('flota:conductorDetalle.asignaciones.asignarDispositivo')}
      </Boton>
    </AccionConMotivo>
  )

  return (
    <Card titulo={t('flota:conductorDetalle.asignaciones.dispositivoTitulo')} acciones={cta}>
      {dispositivos.length === 0 ? (
        <EstadoVacio
          variante="sin-datos"
          icono={Smartphone}
          titulo={t('flota:conductorDetalle.asignaciones.dispositivoVacioTitulo')}
          descripcion={t('flota:conductorDetalle.asignaciones.dispositivoVacioDescripcion')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {dispositivos.map((dispositivo) => (
            <li
              key={dispositivo.asignacionId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-borde bg-superficie-2 p-3"
            >
              <div className="flex min-w-0 flex-col">
                {/* `alias` es nullable: sin el, la identidad real del equipo es el IMEI. */}
                <Link
                  to={`/app/flota/dispositivos/${dispositivo.dispositivoFlotaId}`}
                  className="rounded-sm text-sm text-marca underline-offset-4 hover:underline"
                >
                  {dispositivo.alias ?? dispositivo.imei}
                </Link>
                <span className="font-mono text-xs tracking-wide text-fg-terciario">
                  {dispositivo.imei}
                </span>
                <span className="text-xs text-fg-terciario">
                  {t('flota:conductorDetalle.asignaciones.desde')}{' '}
                  {formatearFecha(dispositivo.fechaAsignacion, i18n.language)}
                </span>
              </div>

              <AccionConMotivo motivo={motivo}>
                <Boton
                  variante="fantasma"
                  tamano="sm"
                  deshabilitado={!puedeAsignar}
                  onClick={() => onDesvincular(dispositivo.asignacionId)}
                >
                  {t('flota:conductorDetalle.asignaciones.desvincular')}
                </Boton>
              </AccionConMotivo>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-fg-terciario">
        {t('flota:conductorDetalle.asignaciones.atribucionNota')}
      </p>
    </Card>
  )
}

/**
 * Historial COMPLETO (activas + cerradas), ORDER BY desde DESC + id DESC. El orden es fijo por
 * contrato: **no hay `sortBy`**, solo paginacion — por eso ninguna columna es ordenable.
 *
 * `fechaFin === null` marca la vigente: una fila sin fecha de fin **no es un dato incompleto**.
 */
function TablaHistorial({
  items,
  cargando,
  error,
}: {
  items: AsignacionConductorHistorialDto[]
  cargando: boolean
  error?: ReactNode
}) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  const columnas: Columna<AsignacionConductorHistorialDto>[] = [
    {
      clave: 'vehiculo',
      titulo: t('flota:conductorDetalle.asignaciones.historialColumnas.vehiculo'),
      tipo: 'nodo',
      render: (item) => (
        <Link
          to={`/app/flota/vehiculos/${item.vehiculoFlotaId}`}
          className={
            item.patente === null
              ? 'rounded-sm text-marca underline-offset-4 hover:underline'
              : 'rounded-sm font-mono tracking-wide text-marca underline-offset-4 hover:underline'
          }
        >
          {/* NUNCA el id como fallback: `v-2` en la columna PATENTE, en mono y al lado de un
              `AB123CD` real, se lee como una patente. El enlace igual tiene texto. */}
          {item.patente ?? t('flota:asignacionVehiculo.sinPatente')}
        </Link>
      ),
    },
    {
      clave: 'rol',
      titulo: t('flota:conductorDetalle.asignaciones.historialColumnas.rol'),
      tipo: 'texto',
      // `defaultValue` siempre que la clave se arme con un código del servidor: `rol` y
      // `motivo_cierre` salen de catálogos DB growables, y sin él una fila nueva del catálogo le
      // muestra al usuario la CLAVE cruda (`flota:rolConductor.tal`), que es lo que la regla de i18n
      // prohíbe. El resto del módulo ya lo hacía; estas 3 eran la excepción.
      render: (item) => t(`flota:rolConductor.${item.rol}`, { defaultValue: item.rol }),
    },
    {
      clave: 'desde',
      titulo: t('flota:conductorDetalle.asignaciones.historialColumnas.desde'),
      tipo: 'fecha',
      render: (item) => formatearFecha(item.fechaInicio, i18n.language),
    },
    {
      clave: 'hasta',
      titulo: t('flota:conductorDetalle.asignaciones.historialColumnas.hasta'),
      tipo: 'nodo',
      render: (item) =>
        item.fechaFin === null ? (
          <Badge variante="exito">{t('flota:conductorDetalle.asignaciones.historialVigente')}</Badge>
        ) : (
          <span className="tabular-nums">{formatearFecha(item.fechaFin, i18n.language)}</span>
        ),
    },
    {
      clave: 'motivo',
      titulo: t('flota:conductorDetalle.asignaciones.historialColumnas.motivo'),
      tipo: 'texto',
      render: (item) =>
        item.motivoCierre === null
          ? ''
          : t(`flota:motivoCierreAsignacion.${item.motivoCierre}`, {
              defaultValue: item.motivoCierre,
            }),
    },
  ]

  return (
    <Tabla
      columnas={columnas}
      filas={items}
      claveFila={(item) => item.asignacionId}
      cargando={cargando}
      filasSkeleton={4}
      error={error}
      vacio={
        <EstadoVacio
          variante="sin-datos"
          icono={Truck}
          titulo={t('flota:conductorDetalle.asignaciones.historialVacioTitulo')}
          descripcion={t('flota:conductorDetalle.asignaciones.historialVacioDescripcion')}
        />
      }
    />
  )
}
