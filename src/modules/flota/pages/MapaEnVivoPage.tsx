import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapPinOff, SearchX } from 'lucide-react'
import { MapaFlota } from '../components/mapa/MapaFlota'
import { MapaPanelDetalle } from '../components/mapa/MapaPanelDetalle'
import { MapaPanelLateral } from '../components/mapa/MapaPanelLateral'
import { PistaDeFueraDelMapa } from '../components/mapa/PistaDeFueraDelMapa'
import { AvisoOperacion } from '../components/AvisoOperacion'
import { useMapaEnVivo } from '../hooks/useMapaEnVivo'
import { useTotalDeLaFlota } from '../hooks/useTotalDeLaFlota'
import { useVehiculoEnVivo } from '../hooks/useVehiculoEnVivo'
import {
  contarFueraDelMapa,
  filtrarItemsDelMapa,
  hayFiltrosDeMapaActivos,
  instanteDeReferencia,
  vacioDelMapa,
} from '../vocabulario-mapa'
import { claveDeVacioPorFiltroDeConexion } from '../vocabulario-conexion'
import type { EstadoConexion, MapaItemDto } from '@/services/contracts/flota'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Boton } from '@/shared/ui/Boton'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import { Spinner } from '@/shared/ui/Spinner'
import { useMapaVivoStore } from '@/stores/mapa-vivo-store'
import { useSessionStore } from '@/stores/session-store'

/**
 * `/app/flota/mapa` — donde esta la flota, ahora.
 *
 * ══ LAS TRES COSAS QUE DECIDEN SI ESTA PANTALLA SIRVE ══════════════════════════════════════════
 * 1. **Un vehiculo sin posicion no se dibuja, y la pantalla lo DICE.** El endpoint devuelve solo los
 *    que tienen posicion conocida (jamas `0,0`), asi que el mapa puede mostrar 3 pines sobre una
 *    flota de 20. Sin explicacion, eso se lee como "perdi 17 vehiculos". El denominador lo aporta
 *    `useTotalDeLaFlota`; el aviso vive en el panel izquierdo y **no arriesga un numero** mientras no
 *    lo sepa.
 * 2. **Telemetria caida es partial-data, no una pantalla de error.** El backend responde 200 igual:
 *    los marcadores sobreviven hasta 60 s desde la cache del mapa —con `sin_dato`, nunca "En linea"
 *    (D-S5-1)— y despues salen. La pantalla muestra lo que hay con su aviso arriba; el unico estado
 *    de error de verdad es que falle el endpoint del mapa.
 * 3. **El polling se apaga con la pestaña oculta** y se reanuda al volver (ver `useMapaEnVivo`).
 *
 * ── LO QUE NO SE DIBUJA, Y NO ES UN OLVIDO ────────────────────────────────────────────────────
 * Flecha de rumbo y burbuja de alertas en el marcador (**B-33**, viajan siempre `null`) · traza
 * historica, playback, paradas y eventos del dia (**B-9**, sin fuente) · geocercas (DIFERIDO, DA-08)
 * · capas de trafico/POIs/talleres/estaciones (DA-MV-03, sin fuente) · vista satelital e hibrida
 * (los tiles ratificados no las tienen) · direccion y barrio (DA-MV-04) · bateria, señal GSM,
 * satelites, km de hoy y telefono del conductor (**B-6** y la ficha §12) · "Mensaje" y "Seguir"
 * (**DA-MV-09**) · los filtros "En ruta"/"Detenido"/"Alerta" del mockup (DA-MV-05 abierta y B-33) ·
 * `motor: ralenti` (umbral PENDIENTE del PO).
 */

const PERMISO_LECTURA = 'flota.vehiculos.leer'
const RUTA_VEHICULOS = '/app/flota/vehiculos'
const RUTA_ONBOARDING = '/app/flota/vehiculos/onboarding'

export default function MapaEnVivoPage() {
  const { t } = useTranslation('flota')
  const { t: tComun } = useTranslation()
  const navigate = useNavigate()
  const [parametros] = useSearchParams()

  // Lectura POR CAMPO: un selector que devuelva un objeto nuevo dispara un bucle de re-render en
  // zustand 5, que compara por identidad.
  const seleccionadoId = useMapaVivoStore((s) => s.vehiculoSeleccionadoId)
  const pestana = useMapaVivoStore((s) => s.pestanaActiva)
  const colapsado = useMapaVivoStore((s) => s.panelLateralColapsado)
  const busqueda = useMapaVivoStore((s) => s.busqueda)
  const estado = useMapaVivoStore((s) => s.estado)
  const seleccionarVehiculo = useMapaVivoStore((s) => s.seleccionarVehiculo)
  const setPestana = useMapaVivoStore((s) => s.setPestana)
  const alternarPanelLateral = useMapaVivoStore((s) => s.alternarPanelLateral)
  const setBusqueda = useMapaVivoStore((s) => s.setBusqueda)
  const setEstado = useMapaVivoStore((s) => s.setEstado)
  const limpiarFiltros = useMapaVivoStore((s) => s.limpiarFiltros)

  const permisos = useSessionStore((s) => s.organizacionActiva?.permisos)
  const puedeCrear = permisos?.includes('flota.vehiculos.crear') ?? false

  const mapa = useMapaEnVivo()
  const flota = useTotalDeLaFlota()
  const enVivo = useVehiculoEnVivo(seleccionadoId)

  const items: readonly MapaItemDto[] = mapa.data?.items ?? []
  const filtros = { busqueda, estado }
  const visibles = filtrarItemsDelMapa(items, filtros)
  const hayFiltros = hayFiltrosDeMapaActivos(filtros)

  const totalDeLaFlota = flota.data?.pagination.totalItems
  const fueraDelMapa = contarFueraDelMapa(totalDeLaFlota, items.length)

  /*
    ── DEEP-LINK `?vehicle=<vehiculoFlotaId>` (A-4: id LOCAL, nunca el canonico) ──────────────────
    Se resuelve UNA sola vez, cuando llega la primera respuesta del mapa — antes no se puede saber si
    ese id esta o no entre los marcadores, y despues el usuario ya pudo haber elegido otro vehiculo
    (reaplicarlo en cada refresco del polling le arrancaria la seleccion de las manos cada 12 s).

    Un id de otra organizacion **no preselecciona nada**: cross-tenant es 404 uniforme, asi que "de
    otra org" y "no existe" son indistinguibles — y aca se suma un tercer caso que produce lo mismo,
    el vehiculo que existe pero no tiene posicion. Los tres caen en el mismo aviso, que es
    exactamente el comportamiento uniforme que el contrato pide.
  */
  const [avisoDelEnlaceDescartado, setAvisoDelEnlaceDescartado] = useState(false)
  const enlaceYaResuelto = useRef<string | null>(null)
  const vehiculoDelEnlace = parametros.get('vehicle')

  useEffect(
    function preseleccionarElVehiculoDelEnlace() {
      if (vehiculoDelEnlace === null || vehiculoDelEnlace === '') return
      // El ref guarda QUE enlace se resolvio, no un booleano: con un booleano, un segundo
      // `?vehicle=Y` empujado sobre la misma pagina montada se ignoraba en silencio.
      if (enlaceYaResuelto.current === vehiculoDelEnlace) return
      if (mapa.data === undefined) return

      if (!mapa.data.items.some((item) => item.vehiculoFlotaId === vehiculoDelEnlace)) {
        /*
          NO se quema la resolucion. El aviso de "el vehiculo del enlace no esta en el mapa" es
          DERIVADO y desaparece solo apenas ese vehiculo empieza a reportar; marcar resuelto aca
          dejaba las dos mitades peleadas — el cartel se limpiaba y no quedaba nada seleccionado.
          Se sigue intentando en cada respuesta, salvo que el usuario ya haya elegido otro vehiculo:
          ahi la seleccion es suya y no se le arrebata.
        */
        if (seleccionadoId !== null) enlaceYaResuelto.current = vehiculoDelEnlace
        return
      }

      enlaceYaResuelto.current = vehiculoDelEnlace
      seleccionarVehiculo(vehiculoDelEnlace)
    },
    [mapa.data, vehiculoDelEnlace, seleccionadoId, seleccionarVehiculo],
  )

  /*
    El aviso se DERIVA, no se guarda en estado: "el id del enlace no esta entre los marcadores" es una
    funcion de la URL y de la respuesta, y guardarlo obligaria a un `setState` dentro del efecto
    —cascada de renders, y el compilador de React 19 lo rechaza—. Ademas se corrige solo: si ese
    vehiculo empieza a reportar, el aviso desaparece sin que nadie lo limpie.
  */
  const avisoDelEnlace =
    !avisoDelEnlaceDescartado &&
    vehiculoDelEnlace !== null &&
    vehiculoDelEnlace !== '' &&
    mapa.data !== undefined &&
    !mapa.data.items.some((item) => item.vehiculoFlotaId === vehiculoDelEnlace)

  /*
    ── EL "AHORA" CONTRA EL QUE SE MIDE LA ANTIGUEDAD DE CADA POSICION ───────────────────────────
    Sale de los sellos de React Query, NO de `Date.now()`:
     1. `Date.now()` es impura y `react-hooks/purity` la rechaza en render, con razon: un valor que
        cambia en cada re-render produce texto distinto sin que haya cambiado ningun dato.
     2. Es mas CORRECTO: todos los chips de una misma tanda se rinden con el mismo origen, en vez de
        que uno diga "hace 12 s" al lado de otro que dice "hace 13 s".

    ⚠️ Pero **no alcanza con `dataUpdatedAt`**, que solo avanza en EXITO. Con la red cortada, el
    banner de arriba decia "No pudimos actualizar el mapa" y cada chip seguia diciendo "hace 8 s"
    indefinidamente. Por eso entra tambien `errorUpdatedAt`: cada intento fallido del polling corre
    el "ahora" y la antiguedad crece a la vista. El porque completo, en `instanteDeReferencia`.
  */
  const ahoraMs = instanteDeReferencia(mapa.dataUpdatedAt, mapa.errorUpdatedAt)

  const errorApi = mapa.error ? parseApiError(mapa.error) : null

  // ── FORBIDDEN ────────────────────────────────────────────────────────────────────────────────
  // El page-gate por claim ya lo aplica `FlotaRoutes`. Esto cubre el otro forbidden: el backend dijo
  // 403 igual (permiso revocado con la sesion abierta, o modulo no activo). Overlay que bloquea,
  // NUNCA redirect (B-3): un redirect le hace creer al usuario que la pantalla no existe.
  if (errorApi?.status === 403) {
    return (
      <div className="relative min-h-96 flex-1">
        <SinAccesoOverlay
          permiso={PERMISO_LECTURA}
          titulo={t('mapa.sinAcceso.titulo')}
          descripcion={t('mapa.sinAcceso.descripcion', { permiso: PERMISO_LECTURA })}
          onVolver={() => navigate('/app')}
          textoVolver={t('mapa.sinAcceso.volver')}
        />
      </div>
    )
  }

  const hayDatosEnMano = mapa.data !== undefined

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-snug text-fg-primario">
            {t('mapa.titulo')}
          </h1>
          <p className="text-sm text-fg-secundario">{t('mapa.subtitulo')}</p>
        </div>
        {/*
          Indicador de refresco. `aria-live="off"`: anunciar "actualizando" cada 12 s a un lector de
          pantalla convierte la pantalla en inusable.
        */}
        {mapa.isFetching ? (
          <span className="flex items-center gap-2 text-xs text-fg-terciario" aria-live="off">
            <Spinner tamano="sm" />
            {t('mapa.actualizando')}
          </span>
        ) : null}
      </header>

      {/*
        Un refetch fallado NO borra el mapa que ya estaba dibujado: con datos en mano es partial-data
        —el aviso arriba, con su reintento— y no una pantalla de error. Sin datos en mano si
        corresponde el panel entero, porque no hay nada que preservar.
      */}
      {errorApi && hayDatosEnMano ? (
        <AvisoOperacion
          titulo={t('mapa.error.tituloRefresco')}
          mensaje={resolveApiErrorMessage(errorApi, tComun)}
          trazaId={errorApi.traceId ?? undefined}
          accion={
            <Boton variante="secundaria" tamano="sm" onClick={() => void mapa.refetch()}>
              {t('mapa.error.reintentar')}
            </Boton>
          }
        />
      ) : null}

      {avisoDelEnlace ? (
        <AvisoOperacion
          titulo={t('mapa.enlace.titulo')}
          mensaje={t('mapa.enlace.descripcion')}
          accion={
            <Boton
              variante="secundaria"
              tamano="sm"
              onClick={() => setAvisoDelEnlaceDescartado(true)}
            >
              {t('mapa.enlace.entendido')}
            </Boton>
          }
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <MapaPanelLateral
          items={items}
          visibles={visibles}
          cargando={mapa.isPending}
          colapsado={colapsado}
          busqueda={busqueda}
          estado={estado}
          seleccionadoId={seleccionadoId}
          fueraDelMapa={fueraDelMapa}
          totalDeLaFlota={totalDeLaFlota}
          hayFiltros={hayFiltros}
          onAlternar={alternarPanelLateral}
          onBusqueda={setBusqueda}
          onEstado={setEstado}
          onLimpiar={limpiarFiltros}
          onSeleccionar={seleccionarVehiculo}
          onVerVehiculos={() => navigate(RUTA_VEHICULOS)}
          ahoraMs={ahoraMs}
        />

        <div className="relative min-h-96 flex-1">
          <LienzoDelMapa
            cargando={mapa.isPending}
            errorSinDatos={errorApi !== null && !hayDatosEnMano}
            mensajeDeError={errorApi ? resolveApiErrorMessage(errorApi, tComun) : ''}
            trazaId={errorApi?.traceId ?? undefined}
            onReintentar={() => void mapa.refetch()}
            items={items}
            visibles={visibles}
            hayFiltros={hayFiltros}
            totalDeLaFlota={totalDeLaFlota}
            fueraDelMapa={fueraDelMapa}
            puedeCrear={puedeCrear}
            seleccionadoId={seleccionadoId}
            onSeleccionar={seleccionarVehiculo}
            onLimpiar={limpiarFiltros}
            onIrAVehiculos={() => navigate(RUTA_VEHICULOS)}
            onIrAlAlta={() => navigate(RUTA_ONBOARDING)}
            estadoDelFiltro={estado}
            busqueda={busqueda}
          />
        </div>

        {seleccionadoId !== null ? (
          <MapaPanelDetalle
            vehiculoFlotaId={seleccionadoId}
            /*
              La patente que el marcador ya mostro. Sin esto, el panel titulaba "Sin patente" durante
              toda la carga: afirmaba una ausencia que la pantalla podia desmentir sola, sobre un pin
              cuyo tooltip acababa de decir la patente.
            */
            patenteConocida={
              items.find((item) => item.vehiculoFlotaId === seleccionadoId)?.patente ?? null
            }
            datos={enVivo.data}
            cargando={enVivo.isPending}
            error={enVivo.error}
            pestana={pestana}
            onPestana={setPestana}
            onCerrar={() => seleccionarVehiculo(null)}
            onReintentar={() => void enVivo.refetch()}
          />
        ) : null}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
 * El lienzo y sus estados
 * ------------------------------------------------------------------------- */

interface LienzoProps {
  cargando: boolean
  errorSinDatos: boolean
  mensajeDeError: string
  trazaId: string | undefined
  onReintentar: () => void
  items: readonly MapaItemDto[]
  visibles: readonly MapaItemDto[]
  hayFiltros: boolean
  totalDeLaFlota: number | undefined
  /** Cuantos vehiculos de la flota no tienen posicion; `null` si el total no se conoce. */
  fueraDelMapa: number | null
  puedeCrear: boolean
  seleccionadoId: string | null
  onSeleccionar: (vehiculoFlotaId: string) => void
  onLimpiar: () => void
  onIrAVehiculos: () => void
  onIrAlAlta: () => void
  estadoDelFiltro: EstadoConexion | ''
  busqueda: string
}

/**
 * Los 5 estados del lienzo. El unico que **reemplaza** al mapa es el error sin datos en mano; los
 * vacios son overlays y el de filtros ni siquiera bloquea.
 *
 * ── LOS DOS VACIOS SON PROBLEMAS DISTINTOS ────────────────────────────────────────────────────
 * La ficha §9 los colapsa en uno solo ("Aun no hay vehiculos para mostrar en el mapa" + "Cuando
 * registres vehiculos con dispositivos GPS asignados..."). Ese copy es correcto para una
 * organizacion **sin vehiculos**, y es una mentira para una que tiene 20 y ninguno reportando: le
 * dice que registre lo que ya registro. Se parten en dos:
 *  · `totalDeLaFlota === 0` (o todavia desconocido) → el copy de la ficha, con sus 2 CTAs;
 *  · `totalDeLaFlota > 0` y cero marcadores → "ninguno de tus N vehiculos tiene posicion conocida",
 *    con las tres causas posibles y el CTA al listado, que es donde se ve cual es cual.
 */
function LienzoDelMapa(props: LienzoProps) {
  const { t } = useTranslation('flota')

  if (props.cargando) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-borde bg-mapa">
        <Spinner tamano="lg" />
      </div>
    )
  }

  if (props.errorSinDatos) {
    return (
      <EstadoError
        variante="recuperable"
        titulo={t('mapa.error.titulo')}
        mensaje={props.mensajeDeError}
        trazaId={props.trazaId}
        textoReintentar={t('mapa.error.reintentar')}
        onReintentar={props.onReintentar}
      />
    )
  }

  return (
    <>
      {/*
        El mapa se monta SIEMPRE que haya con que dibujarlo, incluso sin un solo marcador: los vacios
        son overlays encima, no reemplazos. Dos razones:
         · la ficha §9 pide el vacio como overlay **sobre** el mapa, no en lugar del mapa;
         · desmontar el `MapContainer` cuando la flota se queda sin posiciones —que es justo lo que
           pasa durante una caida de Telemetria, cuando expira la cache de 60 s— tira la instancia de
           Leaflet y le borra al usuario el paneo y el zoom que tenia. Al volver el dato aterrizaria
           en la vista inicial, del otro lado del pais.
      */}
      <MapaFlota
        items={props.visibles}
        seleccionadoId={props.seleccionadoId}
        onSeleccionar={props.onSeleccionar}
        etiquetaDe={(item) => item.patente ?? t('mapa.sinPatente')}
      />

      {props.items.length === 0 ? (
        <OverlayVacio
          totalDeLaFlota={props.totalDeLaFlota}
          puedeCrear={props.puedeCrear}
          onIrAVehiculos={props.onIrAVehiculos}
          onIrAlAlta={props.onIrAlAlta}
        />
      ) : null}

      {/*
        Vacio por FILTROS: banner flotante que NO tapa el mapa (la ficha lo pide explicito). El mapa
        sigue vivo abajo, solo que sin marcadores.
      */}
      {props.items.length > 0 && props.visibles.length === 0 && props.hayFiltros ? (
        <BannerSinResultados
          estadoDelFiltro={props.estadoDelFiltro}
          busqueda={props.busqueda}
          fueraDelMapa={props.fueraDelMapa}
          onLimpiar={props.onLimpiar}
        />
      ) : null}
    </>
  )
}

/**
 * Overlay **bloqueante** de los vacios de datos (ficha §9). Va encima del mapa, no en su lugar.
 *
 * ── POR QUE SON TRES Y NO UNO ─────────────────────────────────────────────────────────────────
 * La ficha los colapsa en un solo copy ("Aun no hay vehiculos para mostrar en el mapa" + "Cuando
 * registres vehiculos con dispositivos GPS asignados..."). Eso es correcto para una organizacion sin
 * vehiculos, y es una MENTIRA para una que tiene 20 y ninguno reportando: le dice que registre lo
 * que ya registro, y esconde que el problema esta en las señales. Se parten en los 3 casos que
 * `vacioDelMapa` distingue — y el tercero es el que se colaba:
 *  · `sin_flota` (total 0) → el copy de la ficha, con sus 2 CTAs;
 *  · `sin_posicion` (total > 0) → "ninguno de tus N vehiculos tiene posicion conocida", con las
 *    tres causas posibles (sin GPS · todavia no reporto · el servicio de posicion no responde) y el
 *    CTA al listado, que es donde cada vehiculo muestra su propio estado de conexion;
 *  · `total_desconocido` (el conteo esta cargando **o fallo**) → lo unico afirmable, sin numero y
 *    **sin el CTA de alta**. Antes este caso caia en el copy de "no tenes vehiculos", que con el
 *    conteo en error no era un flash: era permanente.
 */
function OverlayVacio({
  totalDeLaFlota,
  puedeCrear,
  onIrAVehiculos,
  onIrAlAlta,
}: {
  totalDeLaFlota: number | undefined
  puedeCrear: boolean
  onIrAVehiculos: () => void
  onIrAlAlta: () => void
}) {
  const { t } = useTranslation('flota')

  const cual = vacioDelMapa(totalDeLaFlota)

  const verVehiculos = (clave: string) => (
    <Boton variante="secundaria" onClick={onIrAVehiculos}>
      {t(clave)}
    </Boton>
  )

  return (
    <div className="absolute inset-0 z-(--z-dropdown) flex items-center justify-center rounded-xl bg-velo p-6">
      {cual === 'sin_flota' ? (
        <EstadoVacio
          variante="sin-datos"
          icono={MapPinOff}
          titulo={t('mapa.vacioSinDatos.titulo')}
          descripcion={t('mapa.vacioSinDatos.descripcion')}
          acciones={
            <div className="flex flex-wrap justify-center gap-2">
              {verVehiculos('mapa.vacioSinDatos.ctaVehiculos')}
              {/* Verbo `crear` sin permiso: el CTA no se dibuja (permisos.md §Comportamiento UX). */}
              {puedeCrear ? (
                <Boton onClick={onIrAlAlta}>{t('mapa.vacioSinDatos.ctaAlta')}</Boton>
              ) : null}
            </div>
          }
        />
      ) : null}

      {cual === 'sin_posicion' ? (
        <EstadoVacio
          variante="sin-datos"
          icono={MapPinOff}
          titulo={t('mapa.vacioSinPosicion.titulo', { count: totalDeLaFlota })}
          descripcion={t('mapa.vacioSinPosicion.descripcion')}
          acciones={verVehiculos('mapa.vacioSinPosicion.cta')}
        />
      ) : null}

      {cual === 'total_desconocido' ? (
        <EstadoVacio
          variante="sin-datos"
          icono={MapPinOff}
          titulo={t('mapa.vacioTotalDesconocido.titulo')}
          descripcion={t('mapa.vacioTotalDesconocido.descripcion')}
          acciones={verVehiculos('mapa.vacioTotalDesconocido.cta')}
        />
      ) : null}
    </div>
  )
}

/**
 * Filtrar por "En linea" cuando ninguna fila tiene fuente devuelve vacio, y "ningun vehiculo coincide
 * con tus filtros" es literalmente cierto y completamente engañoso: los vehiculos estan, lo que falta
 * es la señal que decide si estan en linea. `claveDeVacioPorFiltroDeConexion` —la misma que usan los
 * 3 listados— devuelve la explicacion correcta, o `null` cuando el vacio no se le puede atribuir al
 * filtro de conexion (por ejemplo si tambien hay texto tipeado: ahi la causa es indistinguible y se
 * vuelve al copy generico, que no afirma nada).
 */
function BannerSinResultados({
  estadoDelFiltro,
  busqueda,
  fueraDelMapa,
  onLimpiar,
}: {
  estadoDelFiltro: EstadoConexion | ''
  busqueda: string
  fueraDelMapa: number | null
  onLimpiar: () => void
}) {
  const { t } = useTranslation('flota')

  const clave = claveDeVacioPorFiltroDeConexion(estadoDelFiltro, busqueda.trim() !== '')

  return (
    <div
      role="status"
      className="absolute inset-x-4 top-4 z-(--z-dropdown) flex flex-wrap items-center justify-center gap-3 rounded-lg border border-borde bg-superficie-1 px-4 py-3 shadow-lg"
    >
      <SearchX className="size-5 shrink-0 text-fg-terciario" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="text-sm text-fg-secundario">
          {clave === null ? t('mapa.panel.vacioSinResultados') : t(clave)}
        </p>
        <PistaDeFueraDelMapa busqueda={busqueda} fueraDelMapa={fueraDelMapa} />
      </div>
      <Boton variante="secundaria" tamano="sm" onClick={onLimpiar}>
        {t('mapa.panel.limpiar')}
      </Boton>
    </div>
  )
}
