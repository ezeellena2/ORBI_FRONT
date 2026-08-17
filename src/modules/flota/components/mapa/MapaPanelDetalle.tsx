import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Route, X } from 'lucide-react'
import { BadgeConexion } from '../BadgeConexion'
import { PanelSinFuente } from '../dispositivos/detalle/PanelSinFuente'
import { ParDato } from '../detalle/ParDato'
import { SIN_DATO, formatearFechaHora, formatearNumero } from '../detalle/formato'
import { claveDeIgnicion, claveDeMotor, puedeMostrarVelocidad } from '../../vocabulario-mapa'
import type { PestanaDetalleMapa } from '@/stores/mapa-vivo-store'
import type { VehiculoEnVivoDto } from '@/services/contracts/flota'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Boton } from '@/shared/ui/Boton'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { EstadoError } from '@/shared/ui/EstadoError'
import { Skeleton } from '@/shared/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/base/tabs'

/**
 * Panel derecho: el vehiculo seleccionado, en vivo.
 *
 * Arranca **oculto** (la pagina no lo renderiza sin seleccion) para que el mapa use todo el ancho.
 *
 * ══ LOS CAMPOS SON LOS DE `VehiculoEnVivoDto`, Y NINGUNO MAS ═══════════════════════════════════
 * El panel del mockup muestra seis cosas que **no tienen fuente en ninguna capa**, y por eso no se
 * dibujan — no es un recorte de alcance, es que el dato no existe:
 *  - **Señal GSM, satelites, HDOP, red movil**: `TraccarIngestaService` extrae 8 atributos de la
 *    trama y ninguno es esos (**B-6**). El "-68 dBm / Fuerte 4/5" del mockup esta escrito a mano.
 *  - **Bateria del dispositivo**: la fuente upstream existe (`resumen-tecnico`) pero
 *    `VehiculoEnVivoDto` no la incluye — PENDIENTE del PO en la ficha §12.
 *  - **Km recorridos hoy**: exige historico de posiciones, que no existe (**B-9**).
 *  - **Telefono del conductor**: no esta en el DTO del panel.
 *  - **Direccion y barrio**: el geocoding inverso no tiene dueño ni proveedor (**DA-MV-04**).
 *  - **"Mensaje" y "Seguir"**: **DA-MV-09** abierta. En el mockup son `simToast`. Un boton para una
 *    operacion que el backend no puede completar no se dibuja.
 *
 * ══ PARTIAL-DATA POR CAMPO ═════════════════════════════════════════════════════════════════════
 * Con Telemetria sin responder el endpoint devuelve **200** con los campos tecnicos en `null` y los
 * datos propios de Flota intactos. Cada `null` se imprime como dato ausente; el copy **no elige
 * causa** porque el DTO no trae con que distinguir "todavia no reporto" de "Telemetria no responde".
 * `ignicion` merece mencion aparte: es `bool?` upstream, asi que `null` NO es "apagada".
 */

export interface MapaPanelDetalleProps {
  vehiculoFlotaId: string
  /**
   * La patente que el MARCADOR ya mostro, si se la sabe. Es el titulo mientras el detalle carga.
   *
   * Sin esto el panel titulaba `mapa.sinPatente` durante toda la carga: afirmaba una ausencia que la
   * pantalla podia desmentir sola, sobre un pin cuyo tooltip acababa de decir la patente. `null`
   * solo cuando el vehiculo de verdad no tiene (la proyeccion canonica puede no estar vigente).
   */
  patenteConocida: string | null
  /** `undefined` mientras carga. */
  datos: VehiculoEnVivoDto | undefined
  cargando: boolean
  error: unknown
  pestana: PestanaDetalleMapa
  onPestana: (pestana: PestanaDetalleMapa) => void
  onCerrar: () => void
  onReintentar: () => void
}

export function MapaPanelDetalle(props: MapaPanelDetalleProps) {
  const { t } = useTranslation('flota')

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto rounded-xl border border-borde bg-superficie-1 p-4 lg:w-80">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-mono text-sm font-semibold text-fg-primario">
            {props.datos?.patente ?? props.patenteConocida ?? t('mapa.sinPatente')}
          </span>
          {props.datos ? (
            <BadgeConexion
              estado={props.datos.estado}
              sufijo={sufijoDeVelocidad(props.datos, t)}
            />
          ) : null}
        </div>
        <BotonIcono
          icono={X}
          etiqueta={t('mapa.detalle.cerrar')}
          variante="fantasma"
          tamano="sm"
          onClick={props.onCerrar}
        />
      </div>

      <Tabs
        value={props.pestana}
        onValueChange={(valor) => props.onPestana(valor as PestanaDetalleMapa)}
      >
        <TabsList>
          <TabsTrigger value="actual">{t('mapa.detalle.tabs.actual')}</TabsTrigger>
          <TabsTrigger value="recorrido">{t('mapa.detalle.tabs.recorrido')}</TabsTrigger>
        </TabsList>

        <TabsContent value="actual">
          <TabActual {...props} />
        </TabsContent>

        <TabsContent value="recorrido">
          {/*
            ⚠️ NO EMITE NINGUN REQUEST, y es la parte importante.
            `GET /api/flota/vehiculos/{id}/recorridos` responde **siempre** 500
            `flota.telemetria.no_disponible` (B-9: Telemetria no persiste historico de posiciones),
            asi que pedirlo para pintar el estado degradado seria un 500 en la consola y en la
            telemetria de errores de todo usuario que abra la pestaña, para descubrir algo que el
            contrato ya fija. Es exactamente la correccion D-S5F-3, que el tab Historial de la ficha
            del vehiculo ya recibio.

            Tampoco se dibuja el playback (timeline, velocidades 0.5x-4x, paradas y eventos): el shape
            de detalle para reproducir un recorrido **no existe en el contrato** (DA-MV-08 residual).
          */}
          <PanelSinFuente
            icono={Route}
            titulo={t('mapa.recorrido.titulo')}
            descripcion={t('mapa.recorrido.descripcion')}
          />
        </TabsContent>
      </Tabs>

      <Boton
        variante="superficie"
        tamano="sm"
        anchoCompleto
        render={<Link to={`/app/flota/vehiculos/${props.vehiculoFlotaId}`} />}
      >
        {t('mapa.detalle.abrirFicha')}
      </Boton>
    </aside>
  )
}

function TabActual({ datos, cargando, error, onReintentar }: MapaPanelDetalleProps) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  if (cargando) return <Skeleton variante="bloque" repetir={2} />

  if (error) {
    const apiError = parseApiError(error)
    return (
      <EstadoError
        variante="recuperable"
        titulo={t('flota:mapa.detalle.error.titulo')}
        mensaje={resolveApiErrorMessage(apiError, t)}
        trazaId={apiError.traceId ?? undefined}
        textoReintentar={t('flota:mapa.detalle.error.reintentar')}
        onReintentar={onReintentar}
      />
    )
  }

  if (!datos) return null

  const ignicion = claveDeIgnicion(datos.ignicion)

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold text-fg-secundario">
          {t('flota:mapa.detalle.ubicacion.titulo')}
        </h3>
        <dl className="grid">
          <ParDato
            etiqueta={t('flota:mapa.detalle.ubicacion.coordenadas')}
            valor={
              datos.posicion === null
                ? SIN_DATO
                : `${datos.posicion.latitud.toFixed(5)}, ${datos.posicion.longitud.toFixed(5)}`
            }
            mono
          />
          <ParDato
            etiqueta={t('flota:mapa.detalle.ubicacion.altitud')}
            valor={
              datos.altitud === null
                ? SIN_DATO
                : t('flota:mapa.unidades.metros', {
                    valor: formatearNumero(Math.round(datos.altitud), i18n.language),
                  })
            }
            mono
          />
          <ParDato
            etiqueta={t('flota:mapa.detalle.ubicacion.reportada')}
            valor={formatearFechaHora(datos.posicion?.fechaUtc, i18n.language)}
          />
        </dl>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold text-fg-secundario">
          {t('flota:mapa.detalle.telemetria.titulo')}
        </h3>
        <dl className="grid">
          <ParDato
            etiqueta={t('flota:mapa.detalle.telemetria.velocidad')}
            valor={
              datos.velocidadKmh === null
                ? SIN_DATO
                : t('flota:mapa.unidades.kmh', { valor: Math.round(datos.velocidadKmh) })
            }
            mono
          />
          {/*
            Aca el rumbo SI tiene fuente: `ubicacion-actual` es un endpoint per-vehiculo y en una
            superficie de UN recurso eso no es fan-out. Lo que no la tiene es el rumbo del MAPA
            (B-33), y por eso el marcador no lleva flecha de orientacion.
          */}
          <ParDato
            etiqueta={t('flota:mapa.detalle.telemetria.rumbo')}
            valor={
              datos.rumbo === null
                ? SIN_DATO
                : t('flota:mapa.unidades.grados', { valor: Math.round(datos.rumbo) })
            }
            mono
          />
          <ParDato
            etiqueta={t('flota:mapa.detalle.telemetria.motor')}
            valor={datos.motor === null ? SIN_DATO : t(`flota:${claveDeMotor(datos.motor)}`)}
          />
          {/* `null` NO es "apagada": `ignicion` es `bool?` upstream. */}
          <ParDato
            etiqueta={t('flota:mapa.detalle.telemetria.ignicion')}
            valor={ignicion === null ? SIN_DATO : t(`flota:${ignicion}`)}
          />
          <ParDato
            etiqueta={t('flota:mapa.detalle.telemetria.odometro')}
            valor={
              datos.odometroKm === null
                ? SIN_DATO
                : t('flota:mapa.unidades.km', {
                    valor: formatearNumero(Math.round(datos.odometroKm), i18n.language),
                  })
            }
            mono
          />
        </dl>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold text-fg-secundario">
          {t('flota:mapa.detalle.conductor.titulo')}
        </h3>
        <p className="text-sm text-fg-primario">
          {datos.conductorAsignado === null
            ? t('flota:mapa.chip.sinConductor')
            : (datos.conductorAsignado.nombreCompleto ?? t('flota:mapa.chip.conductorSinNombre'))}
        </p>
      </section>

      <p className="text-xs text-fg-terciario">
        {t('flota:mapa.detalle.snapshot', {
          momento: formatearFechaHora(datos.fechaSnapshotUtc, i18n.language),
        })}
      </p>
    </div>
  )
}

/** Mismo criterio que el chip: la velocidad solo acompaña al badge cuando el estado es `en_linea`. */
function sufijoDeVelocidad(
  datos: VehiculoEnVivoDto,
  t: (clave: string, opciones?: Record<string, unknown>) => string,
): string | null {
  if (!puedeMostrarVelocidad(datos.estado)) return null
  if (datos.velocidadKmh === null) return null
  return t('mapa.unidades.kmh', { valor: Math.round(datos.velocidadKmh) })
}
