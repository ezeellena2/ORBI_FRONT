import { Eye, MoreVertical, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { VehiculoBadgeEstado } from './VehiculoBadgeEstado'
import { lecturaDeUltimaSenal } from '../../vocabulario-conexion'
import type { VehiculoListItemDto } from '@/services/contracts/flota'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { MenuAcciones, type ItemMenuAcciones } from '@/shared/ui/MenuAcciones'

/**
 * Las celdas de UNA fila de vehiculo.
 *
 * No es un `<tr>`: la primitiva `Tabla` es duenia de la fila y de la celda (y por eso la tabla
 * puede seguir dibujando el encabezado cuando esta cargando, vacia o en error). Lo que este
 * archivo aporta es el CONTENIDO de cada celda, que es lo unico especifico de Flota.
 * `TablaVehiculos` las ensambla en su descriptor de columnas.
 *
 * Regla que gobierna todas las celdas: los campos de identidad canonica (`patente`, `marca`,
 * `modelo`, `anio`, `tipo`) llegan NULABLES — la proyeccion local del canonico puede no estar
 * vigente — y los tecnicos (`estado`, `ultimaSenal`) llegan vacios cuando Telemetria no responde
 * (partial-data, D-C1 a). En los dos casos la celda muestra su fallback y la fila se sigue viendo
 * entera: nunca se inventa un dato ni se rompe la pantalla.
 */

/** Fallback unico de dato ausente. Se resuelve por i18n para no hardcodear el guion. */
function useSinDato(): string {
  const { t } = useTranslation('flota')
  return t('vehiculosListado.celda.sinDato')
}

function formatearFecha(fechaIso: string, idioma: string): string | null {
  const marca = Date.parse(fechaIso)
  if (Number.isNaN(marca)) return null

  return new Intl.DateTimeFormat(idioma, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(marca))
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

export interface CeldaVehiculoProps {
  vehiculo: VehiculoListItemDto
}

export function CeldaPatente({ vehiculo }: CeldaVehiculoProps) {
  const sinDato = useSinDato()
  return <span>{vehiculo.patente ?? sinDato}</span>
}

/** Dos lineas: `marca modelo` arriba, `anio · tipo` abajo. El tipo se traduce; el codigo no cambia. */
export function CeldaVehiculo({ vehiculo }: CeldaVehiculoProps) {
  const { t } = useTranslation('flota')
  const sinDato = useSinDato()

  const nombre = [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')
  const tipo = vehiculo.tipo
    ? t(`tipoVehiculo.${vehiculo.tipo}`, { defaultValue: vehiculo.tipo })
    : null
  const detalle = [vehiculo.anio === null ? null : String(vehiculo.anio), tipo]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex flex-col">
      <span className="text-fg-primario">{nombre.length > 0 ? nombre : sinDato}</span>
      {detalle.length > 0 ? (
        <span className="text-xs text-fg-terciario">{detalle}</span>
      ) : null}
    </div>
  )
}

/**
 * 🔴 `dispositivo` viene `null` en el 100% de las respuestas, tambien con un GPS instalado:
 * `VehiculoFlotaService.MapearItem` escribe `Dispositivo = null` literal. Por eso el vacio NO dice
 * "Sin dispositivo", que seria una afirmacion falsa en toda fila de toda organizacion: dice que no
 * hay dato y manda —en el titulo— al inventario, que es donde el join SI esta hecho
 * (`DispositivoListItemDto.vehiculoInstalado`).
 *
 * ⚠️ DUENIO ACTUALIZADO: este comentario decia "componerlo es alcance de slice-05". **Ya no**: el
 * backend de slice-05 cerro el 2026-08-12 y NO lo compuso, porque es composicion intra-schema y no
 * depende de Telemetria. `ESTADO.md` deja el dueño en "PO / `f-05` de slice-04". Mientras tanto la
 * rama `dispositivo !== null` es INALCANZABLE, y por eso no se le agrega el enlace al detalle del
 * equipo que pide la ficha §8: la pantalla existe desde slice-03, pero el enlace se escribiria
 * dentro de una rama que ningun response puede producir, o sea sin forma de verificarlo. Lo agrega
 * quien componga el campo, que si va a poder verlo.
 */
export function CeldaDispositivo({ vehiculo }: CeldaVehiculoProps) {
  const { t } = useTranslation('flota')

  if (vehiculo.dispositivo === null) {
    return (
      <span
        className="text-fg-terciario"
        title={t('vehiculosListado.celda.dispositivoSinComponer')}
      >
        {t('vehiculosListado.celda.sinDato')}
      </span>
    )
  }

  return <span title={vehiculo.dispositivo.imei}>{vehiculo.dispositivo.alias}</span>
}

/**
 * 🔴 Mismo caso que la celda de arriba: `conductorPrincipal` viene `null` y `conductoresCount` viene
 * `0` en el 100% de las respuestas. Decir "Sin conductor" era afirmar algo que Flota no puede saber
 * — la asignacion existe y se ve desde la ficha del conductor. Se pinta el marcador de dato ausente.
 *
 * ⚠️ Las 2 ramas de abajo son INALCANZABLES hoy, y el comentario anterior decia que se veian
 * "apenas slice-05 componga los campos": el backend de slice-05 cerro sin componerlos. Se conservan
 * porque el dia que la composicion llegue son exactamente lo que hay que renderizar, pero hasta
 * entonces ningun response las produce.
 */
export function CeldaConductores({ vehiculo }: CeldaVehiculoProps) {
  const { t } = useTranslation('flota')

  if (vehiculo.conductorPrincipal === null) {
    return vehiculo.conductoresCount > 0 ? (
      <span>
        {t('vehiculosListado.celda.conductoresAsignados', { count: vehiculo.conductoresCount })}
      </span>
    ) : (
      <span className="text-fg-terciario" title={t('vehiculosListado.celda.conductorSinComponer')}>
        {t('vehiculosListado.celda.sinDato')}
      </span>
    )
  }

  const extra = vehiculo.conductoresCount - 1

  return (
    <span className="flex items-center gap-1.5">
      <span className="truncate">{vehiculo.conductorPrincipal.nombreCompleto}</span>
      {extra > 0 ? (
        <span className="text-xs text-fg-terciario">
          {t('vehiculosListado.celda.conductoresExtra', { count: extra })}
        </span>
      ) : null}
    </span>
  )
}

export function CeldaEstado({ vehiculo }: CeldaVehiculoProps) {
  return (
    <VehiculoBadgeEstado
      estado={vehiculo.estado}
      velocidadKmH={vehiculo.ultimaSenal?.velocidadKmH ?? null}
    />
  )
}

/**
 * ⚠️ ESTA CELDA ES LA SEGUNDA CARA DE LA TRAMPA DEL SLICE, y por eso NO afirma nada cuando falta el
 * dato: dice **"Sin dato"** —el literal que pide `f-05` §"Los 5 estados" para partial-data— con la
 * explicacion de las 3 causas en el `title`, y el texto sale del MISMO vocabulario que el badge,
 * asi que las 2 celdas de la fila cuentan la misma historia. El porque esta en
 * `lecturaDeUltimaSenal`, que es donde vive la regla y donde esta anclada por test.
 */
export function CeldaUltimaSenal({ vehiculo }: CeldaVehiculoProps) {
  const { t, i18n } = useTranslation('flota')
  const sinDato = useSinDato()

  const lectura = lecturaDeUltimaSenal(vehiculo.ultimaSenal?.fechaUtc ?? null)

  if (lectura.tipo === 'sin_dato') {
    return (
      <span className="text-fg-terciario" title={t(lectura.claveAyuda)}>
        {t(lectura.clave)}
      </span>
    )
  }

  const relativo = formatearRelativo(lectura.fechaUtc, i18n.language)
  return <span className="text-fg-secundario">{relativo ?? sinDato}</span>
}

export function CeldaCreado({ vehiculo }: CeldaVehiculoProps) {
  const { i18n } = useTranslation('flota')
  const sinDato = useSinDato()

  return <span>{formatearFecha(vehiculo.fechaCreacion, i18n.language) ?? sinDato}</span>
}

export interface CeldaAccionesProps extends CeldaVehiculoProps {
  /** `flota.vehiculos.eliminar`. Sin el permiso el item NO se dibuja (permisos.md: verbo `eliminar` = oculto). */
  puedeEliminar: boolean
  onVerDetalle: (vehiculo: VehiculoListItemDto) => void
  onEliminar: (vehiculo: VehiculoListItemDto) => void
}

export function CeldaAcciones({
  vehiculo,
  puedeEliminar,
  onVerDetalle,
  onEliminar,
}: CeldaAccionesProps) {
  const { t } = useTranslation('flota')

  const items: ItemMenuAcciones[] = [
    {
      clave: 'ver-detalle',
      etiqueta: t('vehiculosListado.acciones.verDetalle'),
      icono: Eye,
      onSelect: () => onVerDetalle(vehiculo),
    },
  ]

  if (puedeEliminar) {
    items.push({
      clave: 'eliminar',
      etiqueta: t('vehiculosListado.acciones.eliminar'),
      icono: Trash2,
      tono: 'peligro',
      separadorAntes: true,
      onSelect: () => onEliminar(vehiculo),
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
          etiqueta={t('vehiculosListado.acciones.abrirMenu')}
        />
      }
    />
  )
}
