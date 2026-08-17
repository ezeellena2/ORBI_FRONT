import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Smartphone, Unlink } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { Card } from '@/shared/ui/Card'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import type {
  AsignacionVehiculoDispositivoDto,
  VehiculoDetalleDto,
} from '@/services/contracts/flota'
import { AccionConMotivo } from '../AccionConMotivo'
import { usePermisos } from '../../hooks/usePermisos'
import { ParDato } from './ParDato'

/**
 * Dispositivo GPS asociado + las 2 operaciones de asignacion (`f-07`).
 *
 * La identificacion (`alias`/`imei`) sale del propio `VehiculoDetalleDto`: este tab no pide el
 * detalle del dispositivo. El snapshot tecnico en vivo se DICE, no se dibuja con placeholders que
 * parezcan dato. ⚠️ **El motivo cambio**: ya no es "sin fuente" —`GET /dispositivos/{id}/telemetria`
 * existe desde slice-05 `f-04`— sino que este tab **no tiene el id del equipo**: su unica fuente
 * seria `vehiculo.dispositivo`, que viene `null` en el 100% de las respuestas (ver el bloque 🔴 de
 * abajo). Sin id no hay a quien preguntarle, y adivinarlo no es una opcion.
 *
 * Del mockup NO se portan tres cosas, y ninguna es un olvido:
 *  - "Señal GSM": eliminada del contrato (B-6). Telemetría no captura intensidad de señal,
 *    satélites, `hdop` ni red móvil. Dibujar una barra de señal sería inventar el dato.
 *  - "Firmware": el campo existe en `DispositivoDetalleDto`, no en el detalle del vehículo, y
 *    **no tiene ningún escritor** (D-S3-35, B-16 abierta): mostrarlo acá sería mostrar un `null`
 *    disfrazado de dato.
 *  - "Hacer ping" / "Reiniciar": mapean al comando unificado, que está BLOQUEADO en el contrato
 *    (Telemetría no expone comandos; el stub responde 500 `flota.telemetria.no_disponible`). Un
 *    botón que solo puede fallar no se dibuja.
 *
 * ── POR QUE "DESASOCIAR" PUEDE ESTAR APAGADO CON EL VEHICULO YA ASOCIADO ──────────────────────
 * `DELETE .../asignaciones/dispositivo/{asignacionId}` necesita un id que **ningun GET del contrato
 * expone** (D-S3-16): `VehiculoDetalleDto.dispositivo` trae `dispositivoFlotaId`, `alias` e `imei`,
 * `historialAsignaciones` del dispositivo no lleva el id de la asignacion, y
 * `GET /vehiculos/{id}/asignaciones` no esta implementado. Su UNICA fuente es la respuesta del
 * `POST`. Por eso la accion queda habilitada cuando la asociacion se hizo en esta sesion y
 * deshabilitada **con ese motivo** cuando no — en vez de llamar a una ruta con un id inventado.
 * **Cambiar dispositivo** no tiene ese problema: el `POST` cierra la anterior por su cuenta.
 *
 * ── 🔴 `vehiculo.dispositivo` VIENE `null` SIEMPRE. NO ES "NO TIENE GPS" ──────────────────────
 * `VehiculoFlotaService.MapearItem` lo hardcodea `Dispositivo = null`. ⚠️ **DUENIO ACTUALIZADO**:
 * este comentario decia que componerlo era alcance de **slice-05**, y slice-05 **cerro el
 * 2026-08-12 sin tomarlo** — es composicion **intra-schema** (no depende de Telemetria, que es lo
 * unico que ese slice cableo), asi que no tiene slice dueno y su dueno declarado en `ESTADO.md` es
 * el **PO**. O sea que este campo NO distingue "el vehiculo no tiene GPS" de "Flota todavia no
 * arma ese bloque": es exactamente el caso de **partial-data** de la convencion (200 exitoso con un
 * bloque sin componer), NO el estado **empty**.
 *
 * La version anterior los confundia: renderizaba "Sin dispositivo asociado" como un HECHO. Con un
 * GPS instalado —incluido el que el usuario acababa de asociar en esta misma pantalla— la ficha
 * afirmaba lo contrario de la realidad, y la rama que muestra el equipo era codigo MUERTO: nunca se
 * renderizo ni una vez. Por eso ahora hay tres estados y ninguno afirma lo que Flota no sabe:
 *
 *  1. `vehiculo.dispositivo !== null` → la tarjeta real. Hoy inalcanzable; queda lista para el dia
 *     que el backend componga el campo, y ES la unica rama que puede mostrar alias/IMEI.
 *  2. asignacion hecha EN ESTA SESION → se afirma lo unico que si consta (la asignacion se guardo),
 *     con el enlace a la ficha del dispositivo, que si tiene los datos. Es ademas la unica ventana
 *     en la que `Desasociar` puede funcionar (D-S3-16).
 *  3. ni una cosa ni la otra → se dice que la ficha todavia no compone el dato y se manda al
 *     inventario de dispositivos, cuya columna "Vehiculo" SI lo sabe (ahi el join esta hecho:
 *     `DispositivoListItemDto.vehiculoInstalado`).
 *
 * "Asociar" se ofrece en los tres casos y no puede fallar por esto: si el vehiculo ya tenia un GPS,
 * el `POST` cierra esa asignacion con `motivo_cierre = reasignacion` y devuelve el saliente a
 * `en_stock` (D-S3-14) — no responde `vehiculo.ya_tiene_dispositivo`.
 */
export function TabDispositivo({
  vehiculo,
  asignacionDeSesion,
  onAsociar,
  onDesasociar,
}: {
  vehiculo: VehiculoDetalleDto
  /**
   * La asignacion creada en ESTA sesion, o `null`. Es la unica fuente del `asignacionId` que pide el
   * `DELETE` (D-S3-16) y, mientras `vehiculo.dispositivo` siga sin componerse, tambien la unica
   * prueba que la ficha tiene de que el vehiculo quedo con GPS.
   */
  asignacionDeSesion: AsignacionVehiculoDispositivoDto | null
  onAsociar: () => void
  onDesasociar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const { tienePermiso } = usePermisos()

  const puedeAsignar = tienePermiso('flota.vehiculos.asignar-dispositivo')
  const motivoSinPermiso = puedeAsignar
    ? undefined
    : t('flota:asignacionDispositivo.sinPermiso', { permiso: 'flota.vehiculos.asignar-dispositivo' })

  if (vehiculo.dispositivo === null) {
    return asignacionDeSesion === null ? (
      <SinComponer puedeAsignar={puedeAsignar} motivo={motivoSinPermiso} onAsociar={onAsociar} />
    ) : (
      <AsociadoEnEstaSesion
        asignacion={asignacionDeSesion}
        puedeAsignar={puedeAsignar}
        motivo={motivoSinPermiso}
        onAsociar={onAsociar}
        onDesasociar={onDesasociar}
      />
    )
  }

  const dispositivo = vehiculo.dispositivo
  const asignacionConocida = asignacionDeSesion !== null

  // Desasociar se apaga por DOS motivos distintos y el tooltip dice cuál: falta de permiso, o el
  // hueco de contrato del `asignacionId`. Un botón muerto sin explicación se reporta como bug.
  const motivoDesasociar = !puedeAsignar
    ? motivoSinPermiso
    : asignacionConocida
      ? undefined
      : t('flota:detalle.dispositivo.desasociarSinId')

  return (
    <Card
      titulo={t('flota:detalle.dispositivo.titulo')}
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          <AccionConMotivo motivo={motivoDesasociar}>
            <Boton
              variante="secundaria"
              tamano="sm"
              iconoIzq={Unlink}
              deshabilitado={motivoDesasociar !== undefined}
              onClick={onDesasociar}
            >
              {t('flota:detalle.dispositivo.desasociar')}
            </Boton>
          </AccionConMotivo>

          <AccionConMotivo motivo={motivoSinPermiso}>
            <Boton
              variante="superficie"
              tamano="sm"
              deshabilitado={!puedeAsignar}
              onClick={onAsociar}
            >
              {t('flota:detalle.acciones.cambiarDispositivo')}
            </Boton>
          </AccionConMotivo>
        </div>
      }
    >
      <dl className="grid gap-x-8 sm:grid-cols-2">
        <ParDato etiqueta={t('flota:detalle.dispositivo.alias')} valor={dispositivo.alias} />
        <ParDato etiqueta={t('flota:detalle.dispositivo.imei')} valor={dispositivo.imei} mono />
      </dl>

      <p className="mt-4 rounded-lg border border-dashed border-borde bg-superficie-2 px-4 py-3 text-xs text-fg-secundario">
        {t('flota:detalle.dispositivo.snapshotPendiente')}
      </p>

      <Boton
        variante="fantasma"
        tamano="sm"
        iconoDer={ArrowRight}
        className="mt-4"
        render={<Link to={`/app/flota/dispositivos/${dispositivo.dispositivoFlotaId}`} />}
      >
        {t('flota:detalle.dispositivo.verEnDispositivos')}
      </Boton>
    </Card>
  )
}

/**
 * Estado 3: Flota no compone el bloque y no hay asignacion de esta sesion.
 *
 * NO dice "este vehiculo no tiene GPS" — no lo sabe. Dice que la ficha todavia no lo muestra y
 * manda donde el dato SI esta. Es la diferencia entre partial-data y empty, que la convencion pide
 * mantener separados justamente porque el CTA correcto es distinto.
 */
function SinComponer({
  puedeAsignar,
  motivo,
  onAsociar,
}: {
  puedeAsignar: boolean
  motivo: string | undefined
  onAsociar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <EstadoVacio
      variante="sin-datos"
      icono={Smartphone}
      titulo={t('flota:detalle.dispositivo.sinComponerTitulo')}
      descripcion={t('flota:detalle.dispositivo.sinComponerDescripcion')}
      acciones={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <AccionConMotivo motivo={motivo}>
            <Boton deshabilitado={!puedeAsignar} onClick={onAsociar}>
              {t('flota:detalle.dispositivo.asociar')}
            </Boton>
          </AccionConMotivo>

          <Boton
            variante="secundaria"
            iconoDer={ArrowRight}
            render={<Link to="/app/flota/dispositivos" />}
          >
            {t('flota:detalle.dispositivo.verInventario')}
          </Boton>
        </div>
      }
    />
  )
}

/**
 * Estado 2: la asignacion se hizo en esta sesion.
 *
 * Se muestra lo unico que consta —que quedo guardada— sin inventar alias ni IMEI: la respuesta del
 * `POST` trae ids y fechas, no la identidad del equipo (`AsignacionVehiculoDispositivoDto`). Para
 * eso esta el enlace a la ficha del dispositivo.
 *
 * Es la UNICA ventana en la que `Desasociar` puede ejecutarse, porque es la unica en la que existe
 * el `asignacionId` (D-S3-16). Por eso acá va HABILITADO y no con el motivo de "falta el id".
 */
function AsociadoEnEstaSesion({
  asignacion,
  puedeAsignar,
  motivo,
  onAsociar,
  onDesasociar,
}: {
  asignacion: AsignacionVehiculoDispositivoDto
  puedeAsignar: boolean
  motivo: string | undefined
  onAsociar: () => void
  onDesasociar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <Card
      titulo={t('flota:detalle.dispositivo.recienAsociadoTitulo')}
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          <AccionConMotivo motivo={motivo}>
            <Boton
              variante="secundaria"
              tamano="sm"
              iconoIzq={Unlink}
              deshabilitado={!puedeAsignar}
              onClick={onDesasociar}
            >
              {t('flota:detalle.dispositivo.desasociar')}
            </Boton>
          </AccionConMotivo>

          <AccionConMotivo motivo={motivo}>
            <Boton
              variante="superficie"
              tamano="sm"
              deshabilitado={!puedeAsignar}
              onClick={onAsociar}
            >
              {t('flota:detalle.acciones.cambiarDispositivo')}
            </Boton>
          </AccionConMotivo>
        </div>
      }
    >
      <p className="text-sm text-fg-secundario">
        {t('flota:detalle.dispositivo.recienAsociadoDescripcion')}
      </p>

      <Boton
        variante="fantasma"
        tamano="sm"
        iconoDer={ArrowRight}
        className="mt-4"
        render={<Link to={`/app/flota/dispositivos/${asignacion.dispositivoFlotaId}`} />}
      >
        {t('flota:detalle.dispositivo.verEnDispositivos')}
      </Boton>
    </Card>
  )
}
