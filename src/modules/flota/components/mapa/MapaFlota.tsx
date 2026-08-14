import { useEffect, useRef } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { divIcon } from 'leaflet'
import type { DivIcon, LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import {
  VISTA_INICIAL,
  ZOOM_AL_SELECCIONAR,
  claseDelMarcador,
  limitesDeLaFlota,
  manejadoresDelMarcador,
  posicionEstable,
} from '../../vocabulario-mapa'
import type { LimitesDelMapa } from '../../vocabulario-mapa'
import type { EstadoConexion, MapaItemDto } from '@/services/contracts/flota'
import { appConfig } from '@/config/env'

// El CSS de la DEPENDENCIA. Importarlo es obligatorio (sin el, Leaflet dibuja los tiles apilados en
// una columna) y esta bien que traiga sus propios colores: es CSS de un paquete, no nuestro. Lo que
// pintamos nosotros encima sale de tokens y vive en `mapa.css`.
import 'leaflet/dist/leaflet.css'
import './mapa.css'

/**
 * El mapa. Envuelve Leaflet y **solo dibuja**: no pide datos, no decide que se ve, no conoce filtros.
 *
 * ── LO QUE NO SE DIBUJA, Y NO ES UN OLVIDO ────────────────────────────────────────────────────
 *  - **Flecha de orientacion (rumbo)**: `ubicacion.direccionGrados` viaja **siempre `null`**
 *    (**B-33**): la unica fuente batch de Telemetria no lo trae y pedirlo por vehiculo seria el
 *    fan-out que C-17 prohibe. Un marcador apuntando a 0° diria "va hacia el norte".
 *  - **Burbuja de conteo de alertas**: `alertasActivasCount` tambien viaja siempre `null` (B-33).
 *    Un `0` diria "no tiene alertas", que es lo que no sabemos.
 *  - **Traza del recorrido**: no hay historico de posiciones (**B-9**). El polyline del mockup se
 *    dibuja sobre 5 waypoints inventados.
 *  - **Geocercas**: DIFERIDO (DA-08).
 *  - **Capas de trafico / POIs / talleres / estaciones**: sin fuente (DA-MV-03).
 *  - **Vista satelital / hibrida**: los tiles ratificados (OSM/CARTO, sin API key) no las tienen.
 *  - **Severidad de señales sobre el marcador**: es slice-06.
 *
 * ── ACCESIBILIDAD ─────────────────────────────────────────────────────────────────────────────
 * Los marcadores son focusables por teclado (Leaflet los crea con `tabindex` cuando `keyboard` esta
 * activo) y llevan la patente en `title`. Aun asi, **el camino accesible de esta pantalla es el panel
 * izquierdo**: ahi cada vehiculo es un `<button>` real con su texto. Un mapa de tiles no tiene forma
 * de ser la superficie primaria para un lector de pantalla, y fingir que lo es seria peor que
 * declararlo.
 *
 * ⚠️ **`title` solo lleva dato ESTABLE, y no es una eleccion de estilo**: `updateMarker` de
 * react-leaflet actualiza `position`, `icon`, `zIndexOffset`, `opacity` y `draggable` — y nada mas.
 * `title` entra en las opciones **al crear** el marcador y despues no se vuelve a tocar nunca. Meter
 * ahi el estado de conexion o la antiguedad de la señal (que es lo que haria falta para que un pin
 * gris se distinga de uno verde sin abrir el panel) dejaria un tooltip congelado en el valor que
 * tenia al aparecer el vehiculo: la misma clase de mentira que el resto de la pantalla evita. La
 * leyenda de colores sigue siendo el panel izquierdo — PENDIENTE declarada para el PO.
 */

export interface MapaFlotaProps {
  items: readonly MapaItemDto[]
  seleccionadoId: string | null
  onSeleccionar: (vehiculoFlotaId: string) => void
  /** Texto para el `title` del marcador; lo resuelve la pagina (i18n + fallback sin patente). */
  etiquetaDe: (item: MapaItemDto) => string
}

export function MapaFlota({ items, seleccionadoId, onSeleccionar, etiquetaDe }: MapaFlotaProps) {
  const seleccionado = items.find((item) => item.vehiculoFlotaId === seleccionadoId) ?? null

  return (
    <div className="mapa-flota h-full w-full overflow-hidden rounded-xl border border-borde bg-mapa">
      <MapContainer
        center={VISTA_INICIAL.centro as unknown as LatLngExpression}
        zoom={VISTA_INICIAL.zoom}
        className="h-full w-full"
        // El scroll del mouse sobre un mapa embebido en una pagina que scrollea secuestra el gesto:
        // el usuario quiere bajar y el mapa hace zoom. Con esto, el zoom es por control o por gesto
        // de dos dedos.
        scrollWheelZoom={false}
      >
        <TileLayer url={appConfig.mapaTilesUrl} attribution={appConfig.mapaTilesAtribucion} />

        <AjusteDeTamano />
        <EncuadreDeLaFlota items={items} />
        <EnfoqueDelSeleccionado seleccionado={seleccionado} />

        {items.map((item) => (
          <Marker
            key={item.vehiculoFlotaId}
            // `position` y `eventHandlers` se comparan por IDENTIDAD dentro de react-leaflet: un
            // array o un objeto literal escritos aca reescribirian los N marcadores en cada render
            // (y el buscador re-renderiza en cada tecla). Ver el bloque de estabilidad por valor en
            // `vocabulario-mapa.ts`; es el mismo motivo por el que los iconos se cachean.
            position={
              posicionEstable(
                item.vehiculoFlotaId,
                item.ubicacion.latitud,
                item.ubicacion.longitud,
              ) as unknown as LatLngExpression
            }
            icon={iconoDeVehiculo(item.estado, item.vehiculoFlotaId === seleccionadoId)}
            title={etiquetaDe(item)}
            // El seleccionado se dibuja por encima: sin esto, dos vehiculos en la misma cuadra dejan
            // el elegido debajo del otro y el anillo de seleccion no se ve.
            zIndexOffset={item.vehiculoFlotaId === seleccionadoId ? 1000 : 0}
            eventHandlers={manejadoresDelMarcador(item.vehiculoFlotaId, onSeleccionar)}
          />
        ))}
      </MapContainer>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Iconos
 * ------------------------------------------------------------------------- */

/**
 * Cache de los 8 iconos posibles (4 estados x seleccionado/no).
 *
 * No es micro-optimizacion: `react-leaflet` llama a `setIcon` cada vez que la prop `icon` cambia de
 * IDENTIDAD, y `setIcon` **recrea el nodo del DOM** del marcador. Construir el icono en cada render
 * haria que cada refresco del polling reemplace los N marcadores enteros — se pierde el foco del
 * teclado, parpadea el anillo de seleccion y se cancela cualquier hover.
 *
 * Por eso tampoco entra la patente en el HTML del icono: haria una entrada de cache por vehiculo.
 * La patente viaja en el `title` del marcador, que si es una prop barata.
 */
const iconos = new Map<string, DivIcon>()

function iconoDeVehiculo(estado: EstadoConexion, seleccionado: boolean): DivIcon {
  const clave = `${estado}|${seleccionado}`
  const cacheado = iconos.get(clave)
  if (cacheado) return cacheado

  const clases = ['marcador-vehiculo', claseDelMarcador(estado)]
  if (seleccionado) clases.push('marcador-vehiculo--seleccionado')

  const icono = divIcon({
    // `className` REEMPLAZA a `leaflet-div-icon` (el cuadrado blanco con borde del default).
    className: clases.join(' '),
    html: '<span class="marcador-vehiculo__punto"></span>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })

  iconos.set(clave, icono)
  return icono
}

/* ---------------------------------------------------------------------------
 * Hijos que hablan con la instancia de Leaflet
 * ------------------------------------------------------------------------- */

/**
 * **Leaflet no se entera solo de que cambio el tamaño de su contenedor.**
 *
 * Calcula el viewport una vez al montar y lo cachea; si el contenedor crece o se achica despues
 * —plegar el panel izquierdo, abrir el panel derecho, cambiar de tamaño la ventana— el mapa queda
 * dibujado a medias: tiles grises en la franja nueva, y el peor sintoma, el **hit-testing corrido**
 * (los clicks caen a varios pixeles del marcador). La ficha de la pantalla lo menciona explicito.
 *
 * Un `ResizeObserver` sobre el contenedor cubre los tres casos a la vez, incluido el montaje, sin
 * tener que acordarse de llamar a `invalidateSize()` desde cada componente que cambia el layout.
 */
function AjusteDeTamano() {
  const map = useMap()

  useEffect(
    function observarElTamanoDelContenedor() {
      const contenedor = map.getContainer()
      const observador = new ResizeObserver(() => map.invalidateSize({ animate: false }))
      observador.observe(contenedor)
      return () => observador.disconnect()
    },
    [map],
  )

  return null
}

/**
 * Encuadra la flota **una sola vez**, cuando llegan los primeros marcadores.
 *
 * "Una sola vez" es la parte importante: el polling trae posiciones nuevas cada 12 s, y re-encuadrar
 * en cada refresco le arrancaria el mapa de las manos al usuario cada vez que un camion dobla en una
 * esquina. Despues del primer encuadre, la camara es del usuario — salvo que elija un vehiculo.
 */
function EncuadreDeLaFlota({ items }: { items: readonly MapaItemDto[] }) {
  const map = useMap()
  const yaEncuadro = useRef(false)

  useEffect(
    function encuadrarLaPrimeraVez() {
      if (yaEncuadro.current) return

      const limites = limitesDeLaFlota(items)
      if (limites === null) return

      yaEncuadro.current = true
      map.fitBounds(aBoundsDeLeaflet(limites), {
        padding: [48, 48],
        // Un solo vehiculo da un rectangulo de area cero: sin tope, Leaflet se va al zoom maximo y
        // el usuario aterriza mirando una vereda.
        maxZoom: ZOOM_AL_SELECCIONAR,
        animate: false,
      })
    },
    [items, map],
  )

  return null
}

/**
 * Centra el mapa en el vehiculo elegido.
 *
 * El `ref` con el ultimo id es lo que hace que esto sea usable: sin el, cada respuesta del polling
 * (12 s) volveria a centrar sobre la posicion nueva y el usuario **no podria panear** mientras
 * tuviera algo seleccionado. Se centra al CAMBIAR de vehiculo, no cuando ese vehiculo se mueve.
 *
 * `animate` respeta `prefers-reduced-motion`: el reset global de `base.css` apaga las transiciones
 * CSS, pero el paneo de Leaflet lo hace por JS y no lo alcanza.
 */
function EnfoqueDelSeleccionado({ seleccionado }: { seleccionado: MapaItemDto | null }) {
  const map = useMap()
  const ultimoEnfocado = useRef<string | null>(null)

  useEffect(
    function centrarAlCambiarDeVehiculo() {
      if (seleccionado === null) {
        ultimoEnfocado.current = null
        return
      }

      if (ultimoEnfocado.current === seleccionado.vehiculoFlotaId) return
      ultimoEnfocado.current = seleccionado.vehiculoFlotaId

      map.setView(
        [seleccionado.ubicacion.latitud, seleccionado.ubicacion.longitud],
        Math.max(map.getZoom(), ZOOM_AL_SELECCIONAR),
        { animate: !prefiereMovimientoReducido() },
      )
    },
    [seleccionado, map],
  )

  return null
}

function aBoundsDeLeaflet(limites: LimitesDelMapa): LatLngBoundsExpression {
  return [
    [limites[0][0], limites[0][1]],
    [limites[1][0], limites[1][1]],
  ]
}

function prefiereMovimientoReducido(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
