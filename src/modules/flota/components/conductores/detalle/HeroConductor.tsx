import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  MoreVertical,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Truck,
  UserMinus,
  UserRound,
} from 'lucide-react'
import { Avatar } from '@/shared/ui/Avatar'
import { Boton } from '@/shared/ui/Boton'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { MenuAcciones, type ItemMenuAcciones } from '@/shared/ui/MenuAcciones'
import type { ConductorDetalleDto } from '@/services/contracts/flota'
import { AccionConMotivo } from '../../AccionConMotivo'
import { ConductorBadgeEstado } from '../ConductorBadgeEstado'
import { ConductorBadgeLicencia } from '../ConductorBadgeLicencia'
import { estadoLicenciaVisible } from '../vocabulario-licencia'
import { usePermisos } from '@/shared/auth/permissions/usePermisos'
import { formatearFecha } from '../../detalle/formato'

/**
 * Encabezado de la ficha del conductor: avatar de iniciales, nombre, los 2 badges (estado operativo
 * del catalogo + resumen de licencia), sub-linea y meta, y las acciones.
 *
 * ── EL BADGE DE ESTADO ES EL DEL CATALOGO, NO EL AGRUPADO ─────────────────────────────────────
 * En el listado se agrupa 5 → 3 para poder escanear la tabla; acá se muestra el codigo real
 * (`Pausado`, `En servicio`…), porque es lo que hace falta para decidir una transicion: los dos caen
 * en el mismo badge verde del listado y desde uno se puede pausar y desde el otro no.
 *
 * ── LA IDENTIDAD PUEDE NO ESTAR, Y NO ES UNA FALLA ────────────────────────────────────────────
 * `nombreCompleto`, `dni` y `telefonoPrincipal` salen de la proyeccion canonica, y el gate de PII
 * del `find-or-create` hace que `null` sea el caso NORMAL. Se muestra el fallback y se **explica**;
 * nunca "esta persona no tiene nombre".
 *
 * ── LO QUE NO ESTA EN EL HERO, Y NO ES UN OLVIDO ──────────────────────────────────────────────
 *  - **"Ver en mapa"**: ⚠️ el motivo original de este renglon —"la ruta `/app/flota/mapa` todavia no
 *    esta montada"— **VENCIO** el 2026-08-14 con `f-08`: el mapa existe y la ficha del **vehiculo**
 *    si lleva su boton. Lo que sigue en pie es lo otro que decia: un conductor no tiene posicion
 *    propia, la tiene el vehiculo que maneja, y puede tener mas de uno asignado a la vez (**B-30**),
 *    asi que no hay un `?vehicle=` unico al que apuntar. El deep-link del mapa toma
 *    `vehiculoFlotaId`, no `conductorId`. Hoy es una **decision de diseño**, no una consecuencia:
 *    decide el PO si el hero elige el primer vehiculo vigente o si el boton vive en la tarjeta de
 *    cada vehiculo asignado.
 *  - **Edad**: `fechaNacimiento` no se serializa (no tiene columna).
 *  - **Email**: viene SIEMPRE `null` — la proyeccion no tiene esa columna.
 *  - **"Invitar a app movil"**: no existe endpoint de re-invitacion (DA-CD2-17) y Flota no invoca
 *    Notificaciones. **"Compartir perfil"** y **"Exportar ficha"**: sin endpoint (P-2 / DA-CD2-16).
 */
export function HeroConductor({
  conductor,
  onEditar,
  onCambiarEstado,
  onAsignarVehiculo,
  onVincularDispositivo,
  onDesactivar,
  onReactivar,
  onEliminar,
}: {
  conductor: ConductorDetalleDto
  onEditar: () => void
  onCambiarEstado: () => void
  onAsignarVehiculo: () => void
  onVincularDispositivo: () => void
  onDesactivar: () => void
  onReactivar: () => void
  onEliminar: () => void
}) {
  const { t, i18n } = useTranslation(['flota', 'common'])
  const { tienePermiso } = usePermisos()

  const puedeEditar = tienePermiso('flota.conductores.editar')
  const puedeEliminar = tienePermiso('flota.conductores.eliminar')
  const puedeAsignarVehiculo = tienePermiso('flota.vehiculos.asignar-conductor')
  const puedeAsignarDispositivo = tienePermiso('flota.conductores.asignar-dispositivo')

  const sinNombre = conductor.nombreCompleto === null || conductor.nombreCompleto.trim() === ''
  const nombre = sinNombre
    ? t('flota:conductoresListado.celda.sinNombre')
    : conductor.nombreCompleto

  const sinPermiso = (permiso: string) =>
    t('flota:conductorDetalle.acciones.sinPermiso', { permiso })

  // El vehiculo vigente: el deep-link usa `vehiculoFlotaId` (id LOCAL, convencion A-4), nunca el
  // canonico. `patente` es nullable — la proyeccion canonica puede no estar vigente.
  const vehiculo = conductor.vehiculosAsignados.at(0) ?? null

  const items: ItemMenuAcciones[] = [
    {
      clave: 'cambiar-estado',
      etiqueta: t('flota:conductorDetalle.acciones.cambiarEstado'),
      icono: ShieldCheck,
      deshabilitado: !puedeEditar,
      motivo: puedeEditar ? undefined : sinPermiso('flota.conductores.editar'),
      onSelect: onCambiarEstado,
    },
    {
      clave: 'asignar-vehiculo',
      /*
        ⚠️ NO DICE "CAMBIAR VEHICULO", Y ES A PROPOSITO.
        `ModalAsignarVehiculo` hace **un solo POST**: no cierra la asignación vigente (del lado del
        conductor no hay `asignacionId` — B-19 + el hueco de `dtos.ts`, ver ESTADO.md). Y el backend
        NO lo rechaza: `AsignacionVehiculoConductorService.Asignar` no mira las asignaciones abiertas
        del conductor, y el índice único parcial es por VEHICULO. O sea que "Cambiar vehículo"
        devolvía 201 y dejaba al conductor con DOS asignaciones abiertas, mientras el usuario creía
        haber reemplazado la primera.

        La operación que sí existe es agregar otra. Para cerrar la vigente está "Quitar", en el tab
        Asignaciones, que es el único lugar donde vive su `asignacionId`.
      */
      etiqueta:
        vehiculo === null
          ? t('flota:conductorDetalle.acciones.asignarVehiculo')
          : t('flota:conductorDetalle.acciones.asignarOtroVehiculo'),
      icono: Truck,
      deshabilitado: !puedeAsignarVehiculo,
      motivo: puedeAsignarVehiculo ? undefined : sinPermiso('flota.vehiculos.asignar-conductor'),
      onSelect: onAsignarVehiculo,
    },
    {
      clave: 'vincular-dispositivo',
      etiqueta: t('flota:conductorDetalle.acciones.asignarDispositivo'),
      icono: Smartphone,
      deshabilitado: !puedeAsignarDispositivo,
      motivo: puedeAsignarDispositivo
        ? undefined
        : sinPermiso('flota.conductores.asignar-dispositivo'),
      onSelect: onVincularDispositivo,
    },
  ]

  if (!conductor.activo) {
    // Reactivar pide `editar`, NO `eliminar` (P-F): un usuario puede poder reactivar y no dar de baja.
    items.push({
      clave: 'reactivar',
      etiqueta: t('flota:conductorDetalle.acciones.reactivar'),
      icono: RotateCcw,
      deshabilitado: !puedeEditar,
      motivo: puedeEditar ? undefined : sinPermiso('flota.conductores.editar'),
      onSelect: onReactivar,
    })
  }

  // Verbo `eliminar` = OCULTO sin permiso. Cubre la baja logica y el hard-delete.
  if (puedeEliminar) {
    items.push(
      conductor.activo
        ? {
            clave: 'desactivar',
            etiqueta: t('flota:conductorDetalle.acciones.desactivar'),
            icono: UserMinus,
            tono: 'peligro',
            separadorAntes: true,
            onSelect: onDesactivar,
          }
        : {
            clave: 'eliminar',
            etiqueta: t('flota:conductorDetalle.acciones.eliminar'),
            icono: Trash2,
            tono: 'peligro',
            separadorAntes: true,
            onSelect: onEliminar,
          },
    )
  }

  return (
    <section className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-borde bg-superficie-1 p-5">
      <div className="flex min-w-0 gap-4">
        <Avatar
          soloAvatar
          nombre={nombre ?? ''}
          icono={sinNombre ? UserRound : undefined}
          tamano="xl"
        />

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-snug text-fg-primario">{nombre}</h1>
            <ConductorBadgeEstado
              estado={conductor.estado}
              activo={conductor.activo}
              variante="catalogo"
            />
            <ConductorBadgeLicencia licencia={conductor.licencia} />
          </div>

          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-secundario">
            <span>
              {conductor.numeroLegajo === null
                ? t('flota:conductorDetalle.hero.sinLegajo')
                : t('flota:conductorDetalle.hero.legajo', { valor: conductor.numeroLegajo })}
            </span>
            {conductor.dni === null ? null : (
              <span className="font-mono tracking-wide">
                {t('flota:conductorDetalle.hero.dni', { valor: conductor.dni })}
              </span>
            )}
            {conductor.telefonoPrincipal === null ? null : (
              <span className="font-mono tracking-wide">
                {t('flota:conductorDetalle.hero.telefono', { valor: conductor.telefonoPrincipal })}
              </span>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-terciario">
            <span>
              {t('flota:conductorDetalle.hero.altaOperativa', {
                fecha: formatearFecha(conductor.fechaAltaOperativa, i18n.language),
              })}
            </span>
            {vehiculo === null ? (
              <span>{t('flota:conductorDetalle.hero.sinVehiculo')}</span>
            ) : (
              <Link
                to={`/app/flota/vehiculos/${vehiculo.vehiculoFlotaId}`}
                className="rounded-sm font-mono tracking-wide text-accion underline-offset-2 hover:underline"
              >
                {/* Fallback de patente = texto, NUNCA el id: `v-2` en mono se lee como patente. */}
                {t('flota:conductorDetalle.hero.conduce', {
                  patente: vehiculo.patente ?? t('flota:asignacionVehiculo.sinPatente'),
                })}
              </Link>
            )}
            {sinNombre ? (
              <span>{t('flota:conductorDetalle.hero.identidadNoDisponible')}</span>
            ) : null}
            {estadoLicenciaVisible(conductor.licencia) === 'sin_cargar' ? (
              <span>{t('flota:conductorDetalle.licencia.vacioTitulo')}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <AccionConMotivo motivo={puedeEditar ? undefined : sinPermiso('flota.conductores.editar')}>
          <Boton
            variante="secundaria"
            iconoIzq={Pencil}
            deshabilitado={!puedeEditar}
            onClick={onEditar}
          >
            {t('flota:conductorDetalle.acciones.editar')}
          </Boton>
        </AccionConMotivo>

        <MenuAcciones
          items={items}
          alineacion="end"
          disparador={
            <BotonIcono
              variante="fantasma"
              icono={MoreVertical}
              etiqueta={t('flota:conductorDetalle.acciones.masAcciones')}
            />
          }
        />
      </div>
    </section>
  )
}
