import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CarFront } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Boton } from '@/shared/ui/Boton'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/base/tabs'
import { parseApiError } from '@/shared/errors/parse-api-error'
import type {
  AsignacionVehiculoConductorDto,
  AsignacionVehiculoDispositivoDto,
  VehiculoDetalleDto,
} from '@/services/contracts/flota'
import { useVehiculo } from '../hooks/useVehiculo'
import { ModalAsignarConductor } from '../components/conductores/ModalAsignarConductor'
import { ModalDesasignarVehiculo } from '../components/conductores/ModalesCierreConductor'
import { pillDeConductores } from '../components/conductores/vocabulario-conductor-asignacion'
import { ModalAsociarDispositivo } from '../components/dispositivos/ModalAsociarDispositivo'
import { ModalDesasociarDispositivo } from '../components/dispositivos/ModalDesasociarDispositivo'
import { DetalleCargando } from '../components/detalle/DetalleCargando'
import { HeroVehiculo } from '../components/detalle/HeroVehiculo'
import { MiniStatsVehiculo } from '../components/detalle/MiniStatsVehiculo'
import { ModalBajaVehiculo } from '../components/detalle/ModalBajaVehiculo'
import { ModalEditarVehiculo } from '../components/detalle/ModalEditarVehiculo'
import { TabConductor } from '../components/detalle/TabConductor'
import { TabDispositivo } from '../components/detalle/TabDispositivo'
import { TabHistorial } from '../components/detalle/TabHistorial'
import { TabInfoGeneral } from '../components/detalle/TabInfoGeneral'

/**
 * `/app/flota/vehiculos/:vehiculoFlotaId` — la ficha del vehículo.
 *
 * Es una COMPOSICIÓN DE CAPAS: identidad canónica proyectada (read-only, Flota no la posee) +
 * datos operativos propios de Flota. Las capas de Telemetría (vivo) y Taller (OTs) todavía no
 * tienen fuente, y esta pantalla lo DICE en vez de dibujar un placeholder que parezca dato.
 *
 * LOS 5 ESTADOS OBLIGATORIOS viven acá arriba, antes de cualquier render de contenido:
 *  - loading      → esqueleto de hero + tira + panel (`DetalleCargando`).
 *  - forbidden    → `SinAccesoOverlay` que BLOQUEA la página. Nunca un redirect (B-3): un redirect
 *                   silencioso le hace creer al usuario que la pantalla no existe.
 *  - error 404    → "Vehículo no encontrado". Un id de OTRA organización responde 404, no 403, y la
 *                   UI tampoco intenta distinguirlos: es la regla de cross-tenant uniforme.
 *  - error otro   → recuperable con "Reintentar", sin perder la URL.
 *  - partial-data → NO tiene rama propia acá, y es a propósito: los campos que compone Telemetría
 *                   llegan en `null` dentro de una respuesta 200 exitosa, así que cada bloque
 *                   muestra su fallback y TODO lo propio de Flota se sigue viendo. Convertirlo en
 *                   una pantalla de error sería romper la ficha por una dependencia externa.
 *  - empty        → no aplica a nivel página (un detalle siempre tiene vehículo); vive POR TAB.
 *
 * El tab activo es estado local, no ruta: la ficha se comparte por su URL, y esa URL apunta al
 * vehículo, no a la pestaña que alguien tenía abierta.
 */
export default function VehiculoDetallePage() {
  const { vehiculoFlotaId } = useParams<{ vehiculoFlotaId: string }>()
  const { t } = useTranslation(['flota', 'common'])
  const navigate = useNavigate()
  const consulta = useVehiculo(vehiculoFlotaId)

  // Sin id la consulta queda deshabilitada y `isPending` no baja nunca: mostrar el esqueleto para
  // siempre sería un spinner infinito. La ruta siempre trae el param, pero el caso se cierra igual.
  if (vehiculoFlotaId === undefined) {
    return <VehiculoNoEncontrado />
  }

  if (consulta.isPending) {
    return <DetalleCargando />
  }

  if (consulta.isError) {
    const apiError = parseApiError(consulta.error)

    if (apiError.status === 403) {
      return (
        // `SinAccesoOverlay` es `absolute inset-0`: necesita un contenedor posicionado con alto
        // propio, o se colapsa a cero y el bloqueo no se ve.
        <div className="relative min-h-96 flex-1">
          {/*
            `permiso` es SIEMPRE el permiso literal, nunca `apiError.code`. El overlay lo renderiza
            en un <code> para que el usuario se lo pase a su admin, y el 403 del gate de módulo trae
            `code: flota.modulo.no_activo` — que no existe en el catálogo de 44 permisos. Mostrarlo
            ahí mandaba al admin a buscar un permiso inexistente.
          */}
          <SinAccesoOverlay
            permiso="flota.vehiculos.leer"
            titulo={t('flota:forbidden.titulo')}
            descripcion={t('flota:vehiculosListado.sinAcceso.descripcion', {
              permiso: 'flota.vehiculos.leer',
            })}
            textoVolver={t('flota:forbidden.volver')}
            onVolver={() => navigate('/app')}
          />
        </div>
      )
    }

    if (apiError.status === 404) {
      return <VehiculoNoEncontrado />
    }

    return (
      <EstadoError
        titulo={t('flota:detalle.error.titulo')}
        mensaje={t('flota:detalle.error.descripcion')}
        trazaId={apiError.traceId ?? undefined}
        textoReintentar={t('flota:comun.reintentar')}
        onReintentar={() => void consulta.refetch()}
      />
    )
  }

  return <FichaVehiculo vehiculo={consulta.data} />
}

/**
 * Lee las asignaciones que el wizard de alta deja en el `state` de la navegación.
 *
 * Se VALIDA la forma en vez de castear: `location.state` lo puede escribir cualquier navegación (o
 * un `history.pushState` de otra pestaña de la misma app), así que no es un dato de confianza. Si no
 * tiene la forma esperada se ignora y la ficha se comporta como si no hubiera asignación de sesión
 * — que es el estado honesto, no un error.
 */
function asignacionDeState(state: unknown): AsignacionVehiculoDispositivoDto | null {
  if (typeof state !== 'object' || state === null) return null
  const candidata = (state as { asignacionDispositivo?: unknown }).asignacionDispositivo
  if (typeof candidata !== 'object' || candidata === null) return null

  const { asignacionId, dispositivoFlotaId } = candidata as Record<string, unknown>
  if (typeof asignacionId !== 'string' || typeof dispositivoFlotaId !== 'string') return null

  return candidata as AsignacionVehiculoDispositivoDto
}

/** Gemelo del anterior para el conductor que asignó el paso 3 del wizard. Misma desconfianza. */
function asignacionConductorDeState(state: unknown): AsignacionVehiculoConductorDto | null {
  if (typeof state !== 'object' || state === null) return null
  const candidata = (state as { asignacionConductor?: unknown }).asignacionConductor
  if (typeof candidata !== 'object' || candidata === null) return null

  const { asignacionId, conductorFlotaId, rol } = candidata as Record<string, unknown>
  if (typeof asignacionId !== 'string' || typeof conductorFlotaId !== 'string') return null
  if (rol !== 'principal' && rol !== 'secundario') return null

  return candidata as AsignacionVehiculoConductorDto
}

/** La identidad del conductor tampoco viaja en el DTO: el wizard la manda al lado, o no viene. */
function identidadConductorDeState(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null
  const candidata = (state as { identidadConductor?: unknown }).identidadConductor
  return typeof candidata === 'string' && candidata.trim().length > 0 ? candidata : null
}

function FichaVehiculo({ vehiculo }: { vehiculo: VehiculoDetalleDto }) {
  const { t } = useTranslation(['flota', 'common'])
  const location = useLocation()
  const [modal, setModal] = useState<
    | 'ninguno'
    | 'editar'
    | 'baja'
    | 'asociar'
    | 'desasociar'
    | 'asignar-conductor'
    | 'quitar-conductor'
  >('ninguno')

  /**
   * LA ASIGNACION DE ESTA SESION — y por qué vive acá y no en el DTO.
   *
   * `DELETE .../asignaciones/dispositivo/{asignacionId}` pide el id en la URL, y su ÚNICA fuente en
   * todo el contrato es la respuesta del `POST` (**D-S3-16**): `GET /vehiculos/{id}/asignaciones` no
   * está implementado, `VehiculoDetalleDto.dispositivo` no lo trae y los ítems de
   * `historialAsignaciones` del dispositivo tampoco. Así que se recuerda la de esta sesión.
   *
   * NO se persiste en un store ni en `localStorage`: sería un id que sobrevive a cambios hechos
   * desde otra pestaña o por otro usuario, y el `DELETE` con un id cerrado responde 404
   * `flota.asignacion.no_existe`. Recordarlo de más es peor que no tenerlo: convierte un botón
   * honestamente apagado en uno que falla.
   *
   * ── SE GUARDA EL DTO ENTERO, NO SOLO EL `asignacionId` ────────────────────────────────────────
   * Antes se guardaba el id suelto Y ADEMÁS se lo anulaba con
   * `vehiculo.dispositivo === null ? null : asignacionId`. Como el backend hardcodea
   * `Dispositivo = null` (ver `TabDispositivo`: no lo compone nadie todavía, y ⚠️ **no es de
   * slice-05**, que cerró sin tomarlo), esa guarda daba `null` SIEMPRE: el
   * `ModalDesasociarDispositivo` era código muerto —no había ninguna forma de llegar a renderizarlo,
   * o sea que el `DELETE` no tenía un solo camino en la UI— y el aviso "vas a desinstalar el equipo
   * actual" (`reasigna`) nunca se mostraba, ni siquiera reasignando.
   *
   * Ahora la asignación de sesión vale por sí misma: es la prueba de que el vehículo quedó con GPS
   * cuando el DTO todavía no lo dice. El `dispositivoFlotaId` que trae el DTO es lo que permite
   * enlazar a la ficha del equipo sin inventar su alias.
   */
  const [asignacionDeSesion, setAsignacionDeSesion] = useState<AsignacionVehiculoDispositivoDto | null>(
    // Semilla: el wizard de alta asigna el GPS en su paso 2 y llega acá por su enlace, pasando la
    // asignación en el `state` de la navegación. Sin esto, terminar el wizard y entrar a la ficha
    // perdía el `asignacionId` en el camino — el mismo agujero, un salto de pantalla más tarde.
    // Lazy initializer: se lee UNA vez al montar. `location.state` es dato de entrada, así que se
    // valida su forma en vez de castearlo y confiar.
    () => asignacionDeState(location.state),
  )

  /**
   * LA ASIGNACION DE CONDUCTOR DE ESTA SESION — gemela exacta de la de arriba, y por la misma causa.
   *
   * `DELETE .../asignaciones/conductor/{asignacionId}` pide el id en la URL y del lado del vehículo
   * NADA lo expone: `GET /vehiculos/{id}/asignaciones` no está implementado (B-19) y
   * `VehiculoDetalleDto.conductoresAsignados` viene `[]` en el 100% de las respuestas. Su única
   * fuente acá es la respuesta del `POST` — la de esta sesión, o la que el wizard trae en el `state`.
   *
   * NO se persiste en un store ni en `localStorage`: sería un id que sobrevive a cambios hechos desde
   * otra pestaña o por otro usuario, y el `DELETE` con un id ya cerrado responde 404. Recordarlo de
   * más es peor que no tenerlo: convierte un botón honestamente apagado en uno que falla.
   *
   * Va con su identidad al lado porque el DTO de la asignación trae ids, rol y fechas — no el nombre
   * de la persona (y `nombreCompleto` puede ser `null` por el gate de PII de todos modos).
   */
  const [asignacionConductorDeSesion, setAsignacionConductorDeSesion] =
    useState<AsignacionVehiculoConductorDto | null>(() => asignacionConductorDeState(location.state))
  const [identidadConductorDeSesion, setIdentidadConductorDeSesion] = useState<string | null>(() =>
    identidadConductorDeState(location.state),
  )

  // El vehículo tiene GPS si el DTO lo dice (hoy nunca: el campo no se compone) o si lo asociamos
  // recién. La segunda rama es la única viva.
  const tieneDispositivo = vehiculo.dispositivo !== null || asignacionDeSesion !== null

  const identificacionVehiculo = vehiculo.patente ?? vehiculo.alias ?? vehiculo.id

  /**
   * El pill del tab NO pinta `conductoresCount` crudo: ese campo viene `0` SIEMPRE, también con
   * conductores asignados, así que un "0" ahí afirma algo que Flota no sabe — y contradice a la
   * tarjeta de abajo justo después de asignar. Ver `pillDeConductores`.
   */
  const pill = pillDeConductores(vehiculo.conductoresCount, asignacionConductorDeSesion !== null)

  return (
    <div className="flex flex-col gap-6">
      <EnlaceVolver />

      <HeroVehiculo
        vehiculo={vehiculo}
        identidadConductorDeSesion={identidadConductorDeSesion}
        onEditar={() => setModal('editar')}
        onDarDeBaja={() => setModal('baja')}
        onCambiarDispositivo={() => setModal('asociar')}
        onGestionarConductores={() => setModal('asignar-conductor')}
      />

      <MiniStatsVehiculo vehiculo={vehiculo} />

      <Tabs defaultValue="info">
        <TabsList variant="line" className="flex-wrap">
          <TabsTrigger value="info">{t('flota:detalle.tabs.info')}</TabsTrigger>
          <TabsTrigger value="conductor">
            {t('flota:detalle.tabs.conductor')}
            <Badge variante="neutro">
              {pill.tipo === 'conteo'
                ? pill.valor
                : pill.tipo === 'al_menos'
                  ? t('flota:detalle.conductor.pillAlMenos', { cantidad: pill.valor })
                  : t('flota:detalle.conductor.pillSinDato')}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="dispositivo">{t('flota:detalle.tabs.dispositivo')}</TabsTrigger>
          <TabsTrigger value="historial">{t('flota:detalle.tabs.historial')}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="pt-4">
          <TabInfoGeneral vehiculo={vehiculo} />
        </TabsContent>
        <TabsContent value="conductor" className="pt-4">
          <TabConductor
            vehiculo={vehiculo}
            asignacionDeSesion={asignacionConductorDeSesion}
            identidadDeSesion={identidadConductorDeSesion}
            onAsignar={() => setModal('asignar-conductor')}
            onQuitar={() => setModal('quitar-conductor')}
          />
        </TabsContent>
        <TabsContent value="dispositivo" className="pt-4">
          <TabDispositivo
            vehiculo={vehiculo}
            asignacionDeSesion={asignacionDeSesion}
            onAsociar={() => setModal('asociar')}
            onDesasociar={() => setModal('desasociar')}
          />
        </TabsContent>
        {/*
          El Historial (recorridos) es la superficie DEGRADADA de este vehículo: 500
          `flota.telemetria.no_disponible` por contrato (B-9). El tab **ya no emite ese request** —
          lo declara, como el tab Eventos del dispositivo y el tab Actividad del conductor. El
          `keepMounted={false}` se conserva igual: no hay request que gatear, pero desmontar el panel
          inactivo sigue siendo lo correcto para los otros 3 tabs de esta misma lista.
        */}
        <TabsContent value="historial" className="pt-4" keepMounted={false}>
          <TabHistorial />
        </TabsContent>
      </Tabs>

      {/*
        Los modales se montan solo mientras están abiertos, y es a propósito: así el formulario de
        edición toma sus valores por defecto del vehículo ACTUAL cada vez que se abre, y el error de
        un intento anterior no reaparece en el siguiente.
      */}
      {modal === 'editar' ? (
        <ModalEditarVehiculo vehiculo={vehiculo} abierto onCerrar={() => setModal('ninguno')} />
      ) : null}
      {modal === 'baja' ? (
        <ModalBajaVehiculo vehiculo={vehiculo} abierto onCerrar={() => setModal('ninguno')} />
      ) : null}

      {/*
        Un solo modal para asociar y para cambiar: el `POST` cierra la asignación anterior por su
        cuenta (`motivo_cierre = reasignacion`) y devuelve el GPS saliente a `en_stock` — D-S3-14.
        `reasigna` solo cambia el aviso que se muestra ANTES de confirmar.
      */}
      {modal === 'asociar' ? (
        <ModalAsociarDispositivo
          vehiculoFlotaId={vehiculo.id}
          identificacionVehiculo={identificacionVehiculo}
          reasigna={tieneDispositivo}
          abierto
          onCerrar={() => setModal('ninguno')}
          onAsignado={setAsignacionDeSesion}
        />
      ) : null}

      {/*
        La condición ya NO exige `vehiculo.dispositivo !== null`: ese campo viene `null` siempre en
        slice-03, así que exigirlo hacía este modal inalcanzable. Lo que de verdad hace falta para el
        `DELETE` es el `asignacionId`, y eso es exactamente lo que `asignacionDeSesion` contiene.
      */}
      {modal === 'desasociar' && asignacionDeSesion !== null ? (
        <ModalDesasociarDispositivo
          vehiculoFlotaId={vehiculo.id}
          asignacionId={asignacionDeSesion.asignacionId}
          /*
            `alias` es NULLABLE (D-S3-12: `alias text NULL`), asi que el fallback es `??` y no
            `.length`. Con `.length` sobre un `null` esto tiraba un TypeError ANTES de poder caer al
            IMEI: el comentario describia un fallback que el codigo no podia alcanzar. El IMEI es la
            identidad real y siempre esta.
            Tercer escalon: con el DTO sin componer no hay alias NI imei, y la respuesta del `POST`
            solo trae ids — se nombra al equipo por lo unico cierto en vez de dejar el subtitulo en
            blanco o pintar un uuid.
          */
          identificacionDispositivo={
            vehiculo.dispositivo === null
              ? t('flota:detalle.dispositivo.identificacionRecienAsociado')
              : (vehiculo.dispositivo.alias ?? vehiculo.dispositivo.imei)
          }
          abierto
          onCerrar={() => setModal('ninguno')}
          onDesasignado={() => setAsignacionDeSesion(null)}
        />
      ) : null}

      {/*
        Un solo modal para asignar y para cambiar, pero —a diferencia del de dispositivo— cambiar NO
        es la misma request: el `POST` de conductor no cierra la vigente, así que el modal emite
        `DELETE` + `POST` cuando conoce la asignación vigente (`f-07` §2, no atómico). Que la conozca
        depende de que se haya hecho en esta sesión: no hay `GET` que la exponga (B-19).
      */}
      {modal === 'asignar-conductor' ? (
        <ModalAsignarConductor
          vehiculoFlotaId={vehiculo.id}
          identificacionVehiculo={identificacionVehiculo}
          asignacionVigente={asignacionConductorDeSesion}
          identidadVigente={identidadConductorDeSesion}
          abierto
          onCerrar={() => setModal('ninguno')}
          onAsignado={(nueva, identidad) => {
            setAsignacionConductorDeSesion(nueva)
            setIdentidadConductorDeSesion(identidad)
          }}
          /*
            El cierre salió bien: la asignación vieja ya NO existe. Se olvida en el acto aunque el
            `POST` de la nueva todavía no haya vuelto — si falla, el tab tiene que quedar en su
            estado honesto ("no sabemos") y NO ofreciendo un "Quitar" que apuntaría a una asignación
            cerrada y devolvería 404.
          */
          onVigenteCerrada={() => {
            setAsignacionConductorDeSesion(null)
            setIdentidadConductorDeSesion(null)
          }}
        />
      ) : null}

      {/*
        Sin `asignacionConductorDeSesion` no hay `asignacionId`, y sin él la URL del `DELETE` no se
        puede construir: por eso el modal ni se monta y el botón queda deshabilitado CON SU MOTIVO en
        el tab. La condición NO exige `conductoresAsignados.length > 0`, que viene vacío siempre.
      */}
      {modal === 'quitar-conductor' && asignacionConductorDeSesion !== null ? (
        <ModalDesasignarVehiculo
          asignacion={asignacionConductorDeSesion}
          nombreConductor={
            identidadConductorDeSesion ?? t('flota:asignacionConductor.identidadNoDisponible')
          }
          abierto
          onCerrar={() => setModal('ninguno')}
          onDesasignado={() => {
            setAsignacionConductorDeSesion(null)
            setIdentidadConductorDeSesion(null)
          }}
        />
      ) : null}
    </div>
  )
}

function EnlaceVolver() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <Link
      to="/app/flota/vehiculos"
      className="inline-flex w-fit items-center gap-1.5 text-sm text-fg-secundario hover:text-fg-primario"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {t('flota:comun.volverAVehiculos')}
    </Link>
  )
}

/**
 * 404 UNIFORME. Cubre "no existe" y "existe pero es de otra organización": el backend filtra por
 * `OrganizacionId` en el WHERE, así que los dos casos son indistinguibles — y eso es deliberado, un
 * 403 confirmaría que el id existe en otra organización.
 */
function VehiculoNoEncontrado() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <EstadoVacio
      variante="sin-resultados"
      icono={CarFront}
      titulo={t('flota:detalle.noEncontrado.titulo')}
      descripcion={t('flota:detalle.noEncontrado.descripcion')}
      acciones={
        <Boton variante="secundaria" render={<Link to="/app/flota/vehiculos" />}>
          {t('flota:comun.volverAVehiculos')}
        </Boton>
      }
    />
  )
}
