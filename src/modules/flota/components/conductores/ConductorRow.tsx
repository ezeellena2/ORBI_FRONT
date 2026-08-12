import { useTranslation } from 'react-i18next'
import {
  Eye,
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
import { ConductorBadgeEstado } from './ConductorBadgeEstado'
import { ConductorBadgeLicencia } from './ConductorBadgeLicencia'
import { estadoLicenciaVisible } from './vocabulario-licencia'
import type { ConductorListItemDto } from '@/services/contracts/flota'
import { Avatar } from '@/shared/ui/Avatar'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { MenuAcciones, type ItemMenuAcciones } from '@/shared/ui/MenuAcciones'
import { SIN_DATO } from '../detalle/formato'

/**
 * Las celdas de UNA fila del listado de conductores.
 *
 * No es un `<tr>`: la primitiva `Tabla` es duenia de la fila y de la celda (por eso puede seguir
 * dibujando el encabezado mientras carga, esta vacia o en error). Acá vive solo el CONTENIDO de cada
 * celda; `TablaConductores` las ensambla.
 *
 * ── PARTIAL-DATA ESTRUCTURAL, NO BORDE ────────────────────────────────────────────────────────
 * `nombreCompleto`, `dni` y `telefonoPrincipal` salen de `proyeccion_personas_canonicas_flota`, y el
 * `find-or-create` del Canonico **gatea la PII**: solo devuelve identidad si la organizacion que
 * llama ya tenia relacion con esa Persona. Que lleguen `null` es el caso NORMAL, no una falla — la
 * celda muestra su fallback y **no afirma que la persona no tiene nombre**.
 *
 * ── LO QUE NO SE RENDERIZA, Y NO ES UN OLVIDO ─────────────────────────────────────────────────
 *  - **Email** (2.a linea de la columna Nombre segun la ficha §4): `email` viene SIEMPRE `null` — la
 *    proyeccion no tiene esa columna y el `find-or-create` tampoco lo devuelve. Una linea que nunca
 *    se puede pintar no se dibuja: en su lugar va el legajo, que si es dato propio de Flota.
 *  - **Checkbox de seleccion**: la bulk bar no tiene endpoints bulk en el contrato (ficha §6, sin
 *    soporte). Un checkbox que no habilita nada es ruido.
 *  - **Categoria de licencia**: `licencia.categoria` viene SIEMPRE `null` (B-21, no tiene columna).
 *  - **Badge "En linea"**: composicion con Telemetria, slice-05.
 */

/** Fallback unico de dato ausente en esta tabla. Se resuelve por i18n para no hardcodear el guion. */
function useSinDato(): string {
  const { t } = useTranslation('flota')
  return t('conductoresListado.celda.sinDato', { defaultValue: SIN_DATO })
}

export interface CeldaConductorProps {
  conductor: ConductorListItemDto
}

/**
 * Avatar + nombre + legajo. Sin nombre proyectado, el avatar cae a un icono neutro (las iniciales de
 * un texto de fallback dirian "SN", que se lee como si fueran las iniciales de la persona) y la
 * segunda linea explica POR QUE falta, en vez de dejar un hueco que parece un bug.
 */
export function CeldaConductor({ conductor }: CeldaConductorProps) {
  const { t } = useTranslation('flota')

  const sinNombre = conductor.nombreCompleto === null || conductor.nombreCompleto.trim() === ''
  const nombre = sinNombre ? t('conductoresListado.celda.sinNombre') : conductor.nombreCompleto

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar
        soloAvatar
        nombre={nombre ?? ''}
        icono={sinNombre ? UserRound : undefined}
        tamano="sm"
      />
      <div className="flex min-w-0 flex-col">
        <span className={sinNombre ? 'text-fg-terciario' : 'text-fg-primario'}>{nombre}</span>
        <span className="truncate text-xs text-fg-terciario">
          {conductor.numeroLegajo === null
            ? t('conductoresListado.celda.sinLegajo')
            : t('conductoresListado.celda.legajo', { valor: conductor.numeroLegajo })}
        </span>
      </div>
    </div>
  )
}

export function CeldaDni({ conductor }: CeldaConductorProps) {
  const sinDato = useSinDato()
  return <span>{conductor.dni ?? sinDato}</span>
}

export function CeldaTelefono({ conductor }: CeldaConductorProps) {
  const sinDato = useSinDato()
  return <span>{conductor.telefonoPrincipal ?? sinDato}</span>
}

/**
 * Cantidad de asignaciones VIGENTES (`hasta IS NULL` y `activo`).
 *
 * ⚠️ La ficha §4 pide ademas la PATENTE linkeada del vehiculo vigente, y el listado **no la trae**:
 * `ConductorListItemDto` expone `vehiculosAsignadosCount` y nada mas (el detalle si trae
 * `vehiculosAsignados` con patente). Se muestra el conteo, que es lo que el contrato afirma; la
 * patente esta a un clic, en la ficha. Inventar un segundo request por fila para pintar una celda
 * seria N+1 sobre una pagina entera.
 */
export function CeldaAsignaciones({ conductor }: CeldaConductorProps) {
  const { t } = useTranslation('flota')

  if (conductor.vehiculosAsignadosCount === 0) {
    return <span className="text-fg-terciario">{t('conductoresListado.celda.sinAsignar')}</span>
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-fg-secundario">
      <Truck className="size-3.5" aria-hidden />
      {t('conductoresListado.celda.vehiculosAsignados', {
        count: conductor.vehiculosAsignadosCount,
      })}
    </span>
  )
}

/**
 * Badge de licencia + la fecha o los dias que faltan.
 *
 * El badge NO distingue `por_vencer` de `vigente`: ese corte lo calcula el backend con su umbral y
 * el listado **no lo recibe** (ver `vocabulario-licencia.ts`). Lo que si es exacto —y es lo que el
 * usuario necesita— son los dias que faltan, que vienen calculados del server.
 */
export function CeldaLicencia({ conductor }: CeldaConductorProps) {
  const { t } = useTranslation('flota')

  const estado = estadoLicenciaVisible(conductor.licencia)
  const dias = conductor.licencia?.diasParaVencer ?? null

  return (
    <div className="flex flex-col items-start gap-1">
      <ConductorBadgeLicencia licencia={conductor.licencia} />
      {dias === null ? null : (
        <span className="text-xs text-fg-terciario">
          {estado === 'vencida'
            ? t('conductoresListado.celda.licenciaVencidaHace', { count: Math.abs(dias) })
            : t('conductoresListado.celda.licenciaVenceEnDias', { count: dias })}
        </span>
      )}
    </div>
  )
}

export function CeldaEstado({ conductor }: CeldaConductorProps) {
  return <ConductorBadgeEstado estado={conductor.estado} activo={conductor.activo} />
}

export interface CeldaAccionesConductorProps extends CeldaConductorProps {
  /** `flota.conductores.editar` — verbo `editar`: sin permiso se DESHABILITA con tooltip. */
  puedeEditar: boolean
  /** `flota.conductores.eliminar` — verbo `eliminar`: sin permiso el item NO se dibuja. */
  puedeEliminar: boolean
  /** `flota.vehiculos.asignar-conductor` — grupo VEHICULOS: la accion vive sobre el vinculo. */
  puedeAsignarVehiculo: boolean
  /** `flota.conductores.asignar-dispositivo`. */
  puedeAsignarDispositivo: boolean
  /** `flota.conductores.gestionar-documentos` — gatea tambien el `GET` de documentos (P-F). */
  puedeGestionarDocumentos: boolean
  onVerDetalle: (conductor: ConductorListItemDto) => void
  onEditar: (conductor: ConductorListItemDto) => void
  onCambiarEstado: (conductor: ConductorListItemDto) => void
  onAsignarVehiculo: (conductor: ConductorListItemDto) => void
  onAsignarDispositivo: (conductor: ConductorListItemDto) => void
  onRenovarLicencia: (conductor: ConductorListItemDto) => void
  onDesactivar: (conductor: ConductorListItemDto) => void
  onReactivar: (conductor: ConductorListItemDto) => void
  onEliminar: (conductor: ConductorListItemDto) => void
}

/**
 * Kebab de la fila. El contenido **depende del estado de la fila** (ficha §6): una fila inactiva no
 * ofrece "Desactivar" ni asignaciones, y una activa no ofrece "Reactivar" ni el hard-delete.
 *
 * Comportamiento sin permiso, de `permisos.md` §Comportamiento UX por verbo: `eliminar` **oculto**;
 * el resto **deshabilitado + tooltip con el permiso literal**. Un item deshabilitado con su motivo
 * le dice al usuario que pedirle a su admin; un item ausente lo deja adivinando.
 *
 * ── LO QUE NO ESTA EN EL MENU ─────────────────────────────────────────────────────────────────
 *  - **Compartir**: no existe endpoint (PENDIENTE viva de la ficha §7). El permiso
 *    `flota.conductores.compartir` existe en el catalogo y no gatea nada.
 *  - **Reenviar invitacion**: no existe endpoint de re-invitacion (DA-CD2-17) y Flota **no invoca
 *    Notificaciones**.
 *  - **Ver asignaciones** como modal aparte: el historial vive en la ficha, con su paginacion. Un
 *    segundo lugar donde leer lo mismo se desincroniza solo.
 */
export function CeldaAccionesConductor({
  conductor,
  puedeEditar,
  puedeEliminar,
  puedeAsignarVehiculo,
  puedeAsignarDispositivo,
  puedeGestionarDocumentos,
  onVerDetalle,
  onEditar,
  onCambiarEstado,
  onAsignarVehiculo,
  onAsignarDispositivo,
  onRenovarLicencia,
  onDesactivar,
  onReactivar,
  onEliminar,
}: CeldaAccionesConductorProps) {
  const { t } = useTranslation('flota')

  const sinPermiso = (permiso: string) => t('conductoresListado.acciones.sinPermiso', { permiso })

  const items: ItemMenuAcciones[] = [
    {
      clave: 'ver-detalle',
      etiqueta: t('conductoresListado.acciones.verDetalle'),
      icono: Eye,
      onSelect: () => onVerDetalle(conductor),
    },
    {
      clave: 'editar',
      etiqueta: t('conductoresListado.acciones.editar'),
      icono: Pencil,
      deshabilitado: !puedeEditar,
      motivo: puedeEditar ? undefined : sinPermiso('flota.conductores.editar'),
      onSelect: () => onEditar(conductor),
    },
  ]

  if (conductor.activo) {
    items.push({
      clave: 'cambiar-estado',
      etiqueta: t('conductoresListado.acciones.cambiarEstado'),
      icono: ShieldCheck,
      deshabilitado: !puedeEditar,
      motivo: puedeEditar ? undefined : sinPermiso('flota.conductores.editar'),
      onSelect: () => onCambiarEstado(conductor),
    })

    items.push({
      clave: 'asignar-vehiculo',
      etiqueta: t('conductoresListado.acciones.asignarVehiculo'),
      icono: Truck,
      deshabilitado: !puedeAsignarVehiculo,
      motivo: puedeAsignarVehiculo ? undefined : sinPermiso('flota.vehiculos.asignar-conductor'),
      onSelect: () => onAsignarVehiculo(conductor),
    })

    items.push({
      clave: 'asignar-dispositivo',
      etiqueta: t('conductoresListado.acciones.asignarDispositivo'),
      icono: Smartphone,
      deshabilitado: !puedeAsignarDispositivo,
      motivo: puedeAsignarDispositivo
        ? undefined
        : sinPermiso('flota.conductores.asignar-dispositivo'),
      onSelect: () => onAsignarDispositivo(conductor),
    })

    /*
      "Renovar licencia" NO dispara un toast como el mockup (DA-CL-08): navega al destino REAL, que
      es el tab de documentos de la ficha — el unico lugar donde la licencia se puede cargar
      (`POST .../documentos` con `tipoDocumento: 'licencia'`). Se ofrece siempre, no solo en la
      variante "por vencer": el listado no puede saber cual esta por vencer (ver `CeldaLicencia`).
    */
    items.push({
      clave: 'renovar-licencia',
      etiqueta: t('conductoresListado.acciones.gestionarDocumentos'),
      icono: ShieldCheck,
      deshabilitado: !puedeGestionarDocumentos,
      motivo: puedeGestionarDocumentos
        ? undefined
        : sinPermiso('flota.conductores.gestionar-documentos'),
      onSelect: () => onRenovarLicencia(conductor),
    })
  } else {
    // Reactivar pide `editar`, NO `eliminar` — al reves que la baja (P-F de `permisos.md`). Es la
    // fila de la matriz que no sigue la intuicion y esta transcripta tal cual.
    items.push({
      clave: 'reactivar',
      etiqueta: t('conductoresListado.acciones.reactivar'),
      icono: RotateCcw,
      deshabilitado: !puedeEditar,
      motivo: puedeEditar ? undefined : sinPermiso('flota.conductores.editar'),
      onSelect: () => onReactivar(conductor),
    })
  }

  // Verbo `eliminar` = OCULTO sin permiso. Es el unico que se esconde en vez de deshabilitarse, y
  // cubre las DOS acciones: la baja logica (reversible) y el hard-delete (no lo es).
  if (puedeEliminar) {
    if (conductor.activo) {
      items.push({
        clave: 'desactivar',
        etiqueta: t('conductoresListado.acciones.desactivar'),
        icono: UserMinus,
        tono: 'peligro',
        separadorAntes: true,
        onSelect: () => onDesactivar(conductor),
      })
    } else {
      items.push({
        clave: 'eliminar',
        etiqueta: t('conductoresListado.acciones.eliminar'),
        icono: Trash2,
        tono: 'peligro',
        separadorAntes: true,
        onSelect: () => onEliminar(conductor),
      })
    }
  }

  return (
    <MenuAcciones
      items={items}
      disparador={
        <BotonIcono
          variante="fantasma"
          tamano="sm"
          icono={MoreVertical}
          etiqueta={t('conductoresListado.acciones.abrirMenu')}
        />
      }
    />
  )
}
