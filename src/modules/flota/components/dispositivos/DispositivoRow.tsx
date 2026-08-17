import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, LinkIcon, MoreVertical, PackageCheck, Pencil, Trash2 } from 'lucide-react'
import { DispositivoBadgeStock } from './DispositivoBadgeStock'
import { BadgeConexion } from '../BadgeConexion'
import { claveDeAyudaDeConexionDeEquipo } from '../../vocabulario-conexion'
import type { DispositivoListItemDto } from '@/services/contracts/flota'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { MenuAcciones, type ItemMenuAcciones } from '@/shared/ui/MenuAcciones'

/**
 * Las celdas de UNA fila de dispositivo GPS.
 *
 * No es un `<tr>`: la primitiva `Tabla` es duenia de la fila y de la celda (por eso puede seguir
 * dibujando el encabezado mientras carga, esta vacia o en error). Este archivo aporta el CONTENIDO
 * de cada celda, que es lo unico especifico de Flota. `TablaDispositivos` las ensambla.
 *
 * Lo que NO se renderiza en ninguna celda, y no es un olvido:
 *  - **Senal GSM, satelites, hdop, red movil**: NO EXISTEN en ninguna capa de Telemetria (B-6).
 *    El mockup los dibuja; upstream no los captura. No se piden ni se muestran.
 *  - **Bateria del equipo**: existe, pero por VEHICULO (`resumen-tecnico`) y no en el listado. Vive
 *    en el tab Telemetria de la ficha, que es una llamada por dispositivo.
 */

/** Fallback unico de dato ausente. Se resuelve por i18n para no hardcodear el guion. */
function useSinDato(): string {
  const { t } = useTranslation('flota')
  return t('dispositivosListado.celda.sinDato')
}

/**
 * "hace 12 segundos" / "hace 2 horas". Se calcula contra el reloj del browser porque el contrato
 * sirve la fecha en ISO 8601 UTC y la conversion a hora local es responsabilidad del frontend.
 */
function formatearRelativo(fechaIso: string, idioma: string): string | null {
  const marca = Date.parse(fechaIso)
  if (Number.isNaN(marca)) return null

  const formateador = new Intl.RelativeTimeFormat(idioma, { numeric: 'auto' })
  const segundos = Math.round((marca - Date.now()) / 1000)
  if (Math.abs(segundos) < 60) return formateador.format(segundos, 'second')

  const minutos = Math.round(segundos / 60)
  if (Math.abs(minutos) < 60) return formateador.format(minutos, 'minute')

  const horas = Math.round(minutos / 60)
  if (Math.abs(horas) < 24) return formateador.format(horas, 'hour')

  return formateador.format(Math.round(horas / 24), 'day')
}

export interface CeldaDispositivoProps {
  dispositivo: DispositivoListItemDto
}

/** Dos lineas: alias destacado arriba, `IMEI <numero>` en gris abajo. El IMEI se lee digito a digito. */
export function CeldaAliasImei({ dispositivo }: CeldaDispositivoProps) {
  const { t } = useTranslation('flota')
  const sinDato = useSinDato()

  return (
    <div className="flex flex-col">
      <span className="text-fg-primario">{dispositivo.alias || sinDato}</span>
      <span className="text-xs text-fg-terciario">
        {t('dispositivosListado.celda.imei', { imei: dispositivo.imei })}
      </span>
    </div>
  )
}

/**
 * `modeloNombre` es el nombre DENORMALIZADO del catalogo `modelos_dispositivo_flota` (B-18), no
 * texto libre. Llega `null` cuando el alta se hizo sin modelo: la celda muestra su fallback, nunca
 * un nombre inventado.
 */
export function CeldaModelo({ dispositivo }: CeldaDispositivoProps) {
  const sinDato = useSinDato()
  return <span>{dispositivo.modeloNombre ?? sinDato}</span>
}

/**
 * `null` = el dispositivo no esta instalado en ningun vehiculo. Con vehiculo, la patente es un
 * enlace de SPA al detalle del vehiculo (`/app/flota/vehiculos/:vehiculoFlotaId`), que YA existe.
 */
export function CeldaVehiculo({ dispositivo }: CeldaDispositivoProps) {
  const { t } = useTranslation('flota')

  if (dispositivo.vehiculoInstalado === null) {
    return <span className="text-fg-terciario">{t('dispositivosListado.celda.sinAsignar')}</span>
  }

  // `patente` es NULLABLE (sale de la proyeccion canonica, que puede no estar vigente) y TypeScript
  // no lo caza aca porque `ReactNode` acepta `null`: puesto crudo dejaba un enlace clickeable SIN
  // TEXTO — invisible en la tabla y sin nombre accesible. Se cae a "sin patente", que sigue siendo
  // un enlace util al vehiculo.
  const patente = dispositivo.vehiculoInstalado.patente

  return (
    <Link
      to={`/app/flota/vehiculos/${dispositivo.vehiculoInstalado.vehiculoFlotaId}`}
      className="rounded-sm font-mono text-marca underline-offset-4 hover:text-marca-hover hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-foco/35"
    >
      {patente ?? t('dispositivosListado.celda.sinPatente')}
    </Link>
  )
}

export function CeldaStock({ dispositivo }: CeldaDispositivoProps) {
  return <DispositivoBadgeStock estado={dispositivo.estadoOperativo} />
}

/**
 * Estado de CONEXION del equipo. Es la columna que este slice destraba: `conexion` se compone en el
 * backend desde la fuente batch de Telemetria indexada por **dispositivo canonico** (D-S3-27), en la
 * MISMA llamada que trae `ultimaSenal` — 1 request upstream por listado, nunca uno por fila (C-17).
 *
 * ── LO QUE ESTA CELDA NO PUEDE DECIR MAL ──────────────────────────────────────────────────────
 * `sin_dato` NO es `desconectado`, y en un INVENTARIO la diferencia es todavia mas grande que en la
 * flota: un GPS en stock **nunca aparece** en la fuente batch, asi que su `sin_dato` es por AUSENCIA
 * y es **lo esperable**. Pintarlo rojo convertiria un deposito sano en una pantalla de alarmas.
 *
 * Por eso la ayuda sale de `claveDeAyudaDeConexionDeEquipo(conexion, instalado)`: con el equipo sin
 * vehiculo el tooltip lo dice explicito. Y `instalado` se lee de `vehiculoInstalado` —no de
 * `estadoOperativo`— porque el que no tiene de donde reportar es el equipo **sin vehiculo**, sea
 * `en_stock`, `en_reparacion` o `dado_de_baja`.
 *
 * Con Telemetria caida (partial-data D-C1 a) TODAS las filas caen en `sin_dato` y el resto de la
 * fila —alias, IMEI, modelo, vehiculo, stock— sigue completo. El aviso de la pagina lo explica.
 */
export function CeldaConexion({ dispositivo }: CeldaDispositivoProps) {
  return (
    <BadgeConexion
      estado={dispositivo.conexion}
      claveAyuda={claveDeAyudaDeConexionDeEquipo(
        dispositivo.conexion,
        dispositivo.vehiculoInstalado !== null,
      )}
    />
  )
}

/**
 * `ultimaSenal` YA NO ES una proyeccion persistida (**D-S3-27**, 2026-08-11): la columna
 * `proyeccion_dispositivos_canonicos_flota.ultima_senal_utc` se BORRO con migracion porque no tenia
 * ningun escritor, o sea que servia `null` para siempre disfrazada de dato guardado. Se compone al
 * LEER desde Telemetria, ✅ **con dato real desde slice-05 `f-03`**.
 *
 * `null` sigue siendo un desenlace normal —200 partial-data, sin flag nuevo en el DTO (D-C1 a)— y en
 * ese caso la celda muestra `—`: no se rellena con "ahora" ni con ningun calculo local (`f-07` §5).
 * La ficha declara ademas que esta columna **degrada** junto con la conexion; el "no degrada" que
 * decia la §9 quedo viejo con D-S3-27, cuando el dato dejo de estar persistido.
 */
export function CeldaUltimaSenal({ dispositivo }: CeldaDispositivoProps) {
  const { i18n } = useTranslation('flota')
  const sinDato = useSinDato()

  if (dispositivo.ultimaSenal === null) {
    return <span className="text-fg-terciario">{sinDato}</span>
  }

  const relativo = formatearRelativo(dispositivo.ultimaSenal, i18n.language)
  return <span className="text-fg-secundario">{relativo ?? sinDato}</span>
}

export interface CeldaAccionesProps extends CeldaDispositivoProps {
  /** `flota.dispositivos.editar` — verbo `editar`: sin permiso se DESHABILITA con tooltip. */
  puedeEditar: boolean
  /** `flota.dispositivos.gestionar-stock` — idem: deshabilitado + tooltip. */
  puedeGestionarStock: boolean
  /** `flota.dispositivos.eliminar` — verbo `eliminar`: sin permiso el item NO se dibuja. */
  puedeEliminar: boolean
  /** `flota.vehiculos.asignar-dispositivo` (grupo VEHICULOS, no dispositivos). */
  puedeAsignarVehiculo: boolean
  onVerDetalle: (dispositivo: DispositivoListItemDto) => void
  onEditar: (dispositivo: DispositivoListItemDto) => void
  onCambiarEstadoStock: (dispositivo: DispositivoListItemDto) => void
  onEliminar: (dispositivo: DispositivoListItemDto) => void
  /**
   * Flujo de asignacion DESDE EL LISTADO: acá el dispositivo esta elegido y falta el VEHICULO.
   *
   * ⚠️ **Este bloque decia que el filtro `situacion` de `GET /vehiculos` no estaba implementado
   * (D-S3-33), y quedo FALSO el 2026-08-12**: slice-05 `f-02` lo construyo con sus 4 valores
   * (`EXISTS`/`NOT EXISTS` intra-schema, sin depender de Telemetria). El selector que este flujo
   * necesita —"vehiculos sin dispositivo"— es `situacion=sin_dispositivo_gps`, y describe **exacto**
   * a los candidatos porque el vinculo vehiculo↔GPS es 1:1. La accion esta viva desde entonces:
   * `ModalAsociarAVehiculo`, cableado en `DispositivosListPage`.
   *
   * Sigue siendo OPCIONAL porque el mismo componente se usa donde no hay modal que abrir; mientras
   * llegue `undefined` el item se dibuja DESHABILITADO con su motivo, que manda a la ficha del
   * vehiculo — donde la operacion tambien existe.
   */
  onAsignarVehiculo?: (dispositivo: DispositivoListItemDto) => void
}

export function CeldaAcciones({
  dispositivo,
  puedeEditar,
  puedeGestionarStock,
  puedeEliminar,
  puedeAsignarVehiculo,
  onVerDetalle,
  onEditar,
  onCambiarEstadoStock,
  onEliminar,
  onAsignarVehiculo,
}: CeldaAccionesProps) {
  const { t } = useTranslation('flota')

  const sinPermiso = (permiso: string) => t('dispositivosListado.acciones.sinPermiso', { permiso })

  // Solo se puede asignar un dispositivo que este `en_stock` (el backend valida lo mismo y devuelve
  // 409 `flota.dispositivo.no_disponible`). Con otro estado el item ni se ofrece.
  const asignable = dispositivo.estadoOperativo === 'en_stock'

  const items: ItemMenuAcciones[] = [
    {
      clave: 'ver-detalle',
      etiqueta: t('dispositivosListado.acciones.verDetalle'),
      icono: Eye,
      onSelect: () => onVerDetalle(dispositivo),
    },
  ]

  if (asignable) {
    const motivoAsignar = !puedeAsignarVehiculo
      ? sinPermiso('flota.vehiculos.asignar-dispositivo')
      : onAsignarVehiculo === undefined
        ? t('dispositivosListado.acciones.asignarNoDisponible')
        : undefined

    items.push({
      clave: 'asignar-vehiculo',
      etiqueta: t('dispositivosListado.acciones.asignarVehiculo'),
      icono: LinkIcon,
      deshabilitado: motivoAsignar !== undefined,
      motivo: motivoAsignar,
      onSelect: () => onAsignarVehiculo?.(dispositivo),
    })
  }

  items.push({
    clave: 'editar',
    etiqueta: t('dispositivosListado.acciones.editar'),
    icono: Pencil,
    deshabilitado: !puedeEditar,
    motivo: puedeEditar ? undefined : sinPermiso('flota.dispositivos.editar'),
    onSelect: () => onEditar(dispositivo),
  })

  items.push({
    clave: 'estado-stock',
    etiqueta: t('dispositivosListado.acciones.cambiarEstadoStock'),
    icono: PackageCheck,
    deshabilitado: !puedeGestionarStock,
    motivo: puedeGestionarStock ? undefined : sinPermiso('flota.dispositivos.gestionar-stock'),
    onSelect: () => onCambiarEstadoStock(dispositivo),
  })

  // Verbo `eliminar` = OCULTO sin permiso (permisos.md §Comportamiento UX por verbo). Es el unico
  // que se esconde en vez de deshabilitarse.
  if (puedeEliminar) {
    items.push({
      clave: 'eliminar',
      etiqueta: t('dispositivosListado.acciones.eliminar'),
      icono: Trash2,
      tono: 'peligro',
      separadorAntes: true,
      onSelect: () => onEliminar(dispositivo),
    })
  }

  return (
    <MenuAcciones
      items={items}
      disparador={
        <BotonIcono
          variante="fantasma"
          tamano="sm"
          icono={MoreVertical}
          etiqueta={t('dispositivosListado.acciones.abrirMenu')}
        />
      }
    />
  )
}
