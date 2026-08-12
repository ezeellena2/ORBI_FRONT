import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, UserMinus, UserRound } from 'lucide-react'
import { Avatar } from '@/shared/ui/Avatar'
import { Badge } from '@/shared/ui/Badge'
import { Boton } from '@/shared/ui/Boton'
import { Card } from '@/shared/ui/Card'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import type {
  AsignacionVehiculoConductorDto,
  VehiculoConductorAsignadoDto,
  VehiculoDetalleDto,
} from '@/services/contracts/flota'
import { AccionConMotivo } from '../AccionConMotivo'
import { usePermisos } from '../../hooks/usePermisos'
import { ParDato } from './ParDato'
import { formatearFecha } from './formato'

/**
 * Tab "Conductor" de la ficha del vehículo + las 2 operaciones del vínculo (`f-07` §1).
 *
 * ── ⚠️ EL VACÍO DE ACÁ ES PARTIAL-DATA, NO "NO TIENE CONDUCTOR" ───────────────────────────────
 * `VehiculoDetalleDto.conductoresAsignados` viene **`[]` en el 100% de las respuestas, también con
 * conductores asignados**: `VehiculoFlotaService.MapearDetalle` lo escribe vacío y la composición del
 * lado del vehículo es alcance de slice-05 (misma fila 🔴 que `dispositivo = null`). La tabla
 * `asignaciones_vehiculo_conductor_flota` **existe** desde la migración `Conductores`, así que es
 * composición faltante, no dato faltante.
 *
 * Por eso el copy **no dice "sin conductor asignado"**, que sería una afirmación falsa: dice que Flota
 * no puede mostrarlo desde acá y manda al lugar donde el dato SÍ está (la ficha del conductor, que
 * sirve `vehiculosAsignados` y el historial con su `asignacionId`).
 *
 * ── POR QUÉ "QUITAR CONDUCTOR" PUEDE ESTAR APAGADO CON EL VEHÍCULO YA ASIGNADO ────────────────
 * `DELETE .../asignaciones/conductor/{asignacionId}` necesita un id que **ningún GET del lado del
 * vehículo expone** (B-19: `GET /vehiculos/{id}/asignaciones` no está implementado, y
 * `conductoresAsignados` no lo lleva ni cuando se componga). Su única fuente acá es la respuesta del
 * `POST` de esta sesión. Por eso la acción queda habilitada cuando la asignación se hizo en esta
 * sesión (o vino del wizard) y **deshabilitada con ese motivo** cuando no — nunca llamando a una ruta
 * con un id inventado. **Cambiar conductor** sí funciona siempre: cierra y asigna en dos pasos, y el
 * cierre usa el id que sí tenemos o directamente no hace falta.
 *
 * Tres estados, y ninguno afirma lo que Flota no sabe:
 *  1. `conductoresAsignados.length > 0` → las person-cards reales. Hoy inalcanzable; queda lista para
 *     el día que el backend componga el campo, y ES la única rama que puede mostrar DNI y licencia.
 *  2. asignación hecha EN ESTA SESIÓN → se afirma lo único que consta (quedó guardada, con su rol),
 *     con el enlace a la ficha del conductor, que sí tiene los datos.
 *  3. ni una cosa ni la otra → se dice que la ficha todavía no compone el dato y se ofrece asignar.
 *
 * El **historial de asignaciones** del mockup no entra: `GET /vehiculos/{id}/asignaciones` no está
 * implementado (B-19), así que del lado del vehículo no hay de dónde leerlo. Vive en la ficha del
 * conductor, que es su fuente real.
 */
export function TabConductor({
  vehiculo,
  asignacionDeSesion,
  identidadDeSesion,
  onAsignar,
  onQuitar,
}: {
  vehiculo: VehiculoDetalleDto
  /**
   * La asignación creada en ESTA sesión, o `null`. Es la única fuente del `asignacionId` que el
   * `DELETE` pide (B-19) y, mientras `conductoresAsignados` siga sin componerse, también la única
   * prueba que la ficha tiene de que el vehículo quedó con conductor.
   */
  asignacionDeSesion: AsignacionVehiculoConductorDto | null
  /** Identidad del conductor de esa asignación. La respuesta del `POST` solo trae ids. */
  identidadDeSesion: string | null
  onAsignar: () => void
  onQuitar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const { tienePermiso } = usePermisos()

  const puedeAsignar = tienePermiso('flota.vehiculos.asignar-conductor')
  const motivoSinPermiso = puedeAsignar
    ? undefined
    : t('flota:asignacionConductor.sinPermiso', { permiso: 'flota.vehiculos.asignar-conductor' })

  if (vehiculo.conductoresAsignados.length === 0) {
    return asignacionDeSesion === null ? (
      <SinComponer puedeAsignar={puedeAsignar} motivo={motivoSinPermiso} onAsignar={onAsignar} />
    ) : (
      <AsignadoEnEstaSesion
        asignacion={asignacionDeSesion}
        identidad={identidadDeSesion}
        puedeAsignar={puedeAsignar}
        motivo={motivoSinPermiso}
        onAsignar={onAsignar}
        onQuitar={onQuitar}
      />
    )
  }

  // Quitar se apaga por DOS motivos distintos y el tooltip dice cuál: falta de permiso, o el hueco de
  // contrato del `asignacionId`. Un botón muerto sin explicación se reporta como bug.
  const motivoQuitar = !puedeAsignar
    ? motivoSinPermiso
    : asignacionDeSesion === null
      ? t('flota:detalle.conductor.quitarSinId')
      : undefined

  return (
    <Card
      titulo={t('flota:detalle.conductor.titulo')}
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          <AccionConMotivo motivo={motivoQuitar}>
            <Boton
              variante="secundaria"
              tamano="sm"
              iconoIzq={UserMinus}
              deshabilitado={motivoQuitar !== undefined}
              onClick={onQuitar}
            >
              {t('flota:detalle.conductor.quitar')}
            </Boton>
          </AccionConMotivo>

          <AccionConMotivo motivo={motivoSinPermiso}>
            <Boton
              variante="superficie"
              tamano="sm"
              deshabilitado={!puedeAsignar}
              onClick={onAsignar}
            >
              {t('flota:detalle.conductor.cambiar')}
            </Boton>
          </AccionConMotivo>
        </div>
      }
    >
      <ul className="flex flex-col gap-4">
        {vehiculo.conductoresAsignados.map((conductor) => (
          <li key={conductor.conductorFlotaId}>
            <FichaConductor conductor={conductor} />
          </li>
        ))}
      </ul>
    </Card>
  )
}

/**
 * Estado 3: Flota no compone el bloque y no hay asignación de esta sesión.
 *
 * NO dice "este vehículo no tiene conductor" — no lo sabe. Dice que la ficha todavía no lo muestra y
 * manda donde el dato SÍ está. Es la diferencia entre partial-data y empty, que la convención pide
 * mantener separados justamente porque el CTA correcto es distinto.
 */
function SinComponer({
  puedeAsignar,
  motivo,
  onAsignar,
}: {
  puedeAsignar: boolean
  motivo: string | undefined
  onAsignar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <EstadoVacio
      variante="sin-datos"
      icono={UserRound}
      titulo={t('flota:detalle.conductor.vacioTitulo')}
      descripcion={t('flota:detalle.conductor.vacioDescripcion')}
      acciones={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <AccionConMotivo motivo={motivo}>
            <Boton deshabilitado={!puedeAsignar} onClick={onAsignar}>
              {t('flota:detalle.conductor.asignar')}
            </Boton>
          </AccionConMotivo>

          <Boton
            variante="secundaria"
            iconoDer={ArrowRight}
            render={<Link to="/app/flota/conductores" />}
          >
            {t('flota:detalle.conductor.irAConductores')}
          </Boton>
        </div>
      }
    />
  )
}

/**
 * Estado 2: la asignación se hizo en esta sesión (o la trajo el wizard).
 *
 * Se muestra lo único que consta —que quedó guardada, con su rol y su fecha— sin inventar DNI ni
 * licencia: la respuesta del `POST` trae ids, rol y fechas (`AsignacionVehiculoConductorDto`), no la
 * identidad de la persona. El nombre solo aparece si venía del selector; si no, se dice que no está
 * disponible en vez de imprimir un uuid.
 *
 * Es la ÚNICA ventana en la que `Quitar` puede ejecutarse, porque es la única en la que existe el
 * `asignacionId` (B-19). Por eso acá va HABILITADO y no con el motivo de "falta el id".
 */
function AsignadoEnEstaSesion({
  asignacion,
  identidad,
  puedeAsignar,
  motivo,
  onAsignar,
  onQuitar,
}: {
  asignacion: AsignacionVehiculoConductorDto
  identidad: string | null
  puedeAsignar: boolean
  motivo: string | undefined
  onAsignar: () => void
  onQuitar: () => void
}) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  // Sin identidad se muestra el ícono genérico, NO las iniciales de la frase de fallback: un avatar
  // que dijera "ID" leería como si esas fueran las iniciales de la persona.
  const identidadVisible = identidad ?? t('flota:asignacionConductor.identidadNoDisponible')

  return (
    <Card
      titulo={t('flota:detalle.conductor.recienAsignadoTitulo')}
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          <AccionConMotivo motivo={motivo}>
            <Boton
              variante="secundaria"
              tamano="sm"
              iconoIzq={UserMinus}
              deshabilitado={!puedeAsignar}
              onClick={onQuitar}
            >
              {t('flota:detalle.conductor.quitar')}
            </Boton>
          </AccionConMotivo>

          <AccionConMotivo motivo={motivo}>
            <Boton
              variante="superficie"
              tamano="sm"
              deshabilitado={!puedeAsignar}
              onClick={onAsignar}
            >
              {t('flota:detalle.conductor.cambiar')}
            </Boton>
          </AccionConMotivo>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar
            nombre={identidadVisible}
            icono={identidad === null ? UserRound : undefined}
            soloAvatar
          />
          <span className="text-sm font-medium text-fg-primario">{identidadVisible}</span>
          <Badge variante={asignacion.rol === 'principal' ? 'accion' : 'neutro'}>
            {t(`flota:rolConductor.${asignacion.rol}`)}
          </Badge>
        </div>

        <p className="text-sm text-fg-secundario">
          {t('flota:detalle.conductor.recienAsignadoDescripcion')}
        </p>

        <dl className="grid gap-x-8 sm:grid-cols-2">
          <ParDato
            etiqueta={t('flota:detalle.conductor.asignadoDesde')}
            valor={formatearFecha(asignacion.fechaAsignacion, i18n.language)}
          />
        </dl>

        <Boton
          variante="fantasma"
          tamano="sm"
          iconoDer={ArrowRight}
          className="w-fit"
          render={<Link to={`/app/flota/conductores/${asignacion.conductorFlotaId}`} />}
        >
          {t('flota:detalle.conductor.verPerfil')}
        </Boton>
      </div>
    </Card>
  )
}

/**
 * Proyección READ-ONLY de Persona canónica: se edita en la superficie canónica, nunca desde Flota.
 *
 * El "vence {fecha}" de la licencia que muestra el mockup NO se renderiza: `categoriaLicencia` viene
 * sin vencimiento en el DTO — PENDIENTE (DA-nueva), lo decide el PO. La categoría misma tampoco tiene
 * columna en ninguna tabla (B-21), así que su celda muestra el fallback aun cuando el bloque se
 * componga.
 */
function FichaConductor({ conductor }: { conductor: VehiculoConductorAsignadoDto }) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-borde bg-superficie-2 p-4">
      <div className="flex items-center gap-3">
        <Avatar nombre={conductor.nombreCompleto} soloAvatar />
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium text-fg-primario">{conductor.nombreCompleto}</span>
          <span className="text-xs text-fg-secundario">{conductor.email ?? conductor.dni}</span>
        </div>
        <Badge variante={conductor.rol === 'principal' ? 'accion' : 'neutro'} className="ml-auto">
          {t(`flota:rolConductor.${conductor.rol}`)}
        </Badge>
      </div>

      <dl className="grid gap-x-8 sm:grid-cols-2">
        <ParDato etiqueta={t('flota:detalle.conductor.dni')} valor={conductor.dni} mono />
        <ParDato
          etiqueta={t('flota:detalle.conductor.licencia')}
          valor={conductor.categoriaLicencia?.toUpperCase()}
        />
        <ParDato etiqueta={t('flota:detalle.conductor.telefono')} valor={conductor.telefono} />
        <ParDato
          etiqueta={t('flota:detalle.conductor.asignadoDesde')}
          valor={formatearFecha(conductor.fechaAsignacion, i18n.language)}
        />
      </dl>

      <Boton
        variante="fantasma"
        tamano="sm"
        iconoDer={ArrowRight}
        className="w-fit"
        render={<Link to={`/app/flota/conductores/${conductor.conductorFlotaId}`} />}
      >
        {t('flota:detalle.conductor.verPerfil')}
      </Boton>
    </div>
  )
}
