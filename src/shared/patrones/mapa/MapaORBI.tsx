import { useEffect, useRef, type ReactNode } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { divIcon } from 'leaflet'
import type { DivIcon, LatLngExpression } from 'leaflet'
import {
  VISTA_POR_DEFECTO,
  ZOOM_AL_SELECCIONAR,
  limitesDe,
  manejadoresDelMarcador,
  posicionEstable,
  type EntidadUbicada,
} from './geometria'
import { aBoundsDeLeaflet } from './bounds'
import { ControlesDelMapa } from './ControlesDelMapa'
import { appConfig } from '@/config/env'

// El CSS de la DEPENDENCIA. Importarlo es obligatorio (sin el, Leaflet dibuja los tiles apilados en
// una columna) y esta bien que traiga sus propios colores: es CSS de un paquete, no nuestro. Lo que
// pintamos nosotros encima sale de tokens y vive en `mapa.css`.
import 'leaflet/dist/leaflet.css'
import './mapa.css'

/**
 * El mapa de la plataforma. Envuelve Leaflet y **solo dibuja**: no pide datos, no decide qué se ve,
 * no conoce filtros. Una entidad, para él, es *algo con posición* — no sabe qué es un vehículo.
 *
 * Contrato: `TracAutoV2/docsv2/02-arquitectura/frontend/07-capa-compartida.md` §4.
 *
 * ── LO QUE NO SE DIBUJA, Y NO ES UN OLVIDO ────────────────────────────────────────────────────
 * Esta lista viaja con el componente porque es la diferencia entre "no está hecho" y "no se puede
 * hacer todavía". Los códigos entre paréntesis son del contrato de Flota, que fue el primer
 * consumidor; el motivo vale igual para cualquier módulo que no tenga la fuente.
 *  - **Flecha de orientacion (rumbo)**: si el rumbo viaja `null` (caso de Flota, **B-33**: la unica
 *    fuente batch de Telemetria no lo trae y pedirlo por entidad seria el fan-out que C-17 prohibe),
 *    un marcador apuntando a 0° diria "va hacia el norte".
 *  - **Burbuja de conteo de alertas**: idem — un `0` diria "no tiene alertas", que es lo que no
 *    sabemos.
 *  - **Traza del recorrido**: no hay historico de posiciones (**B-9**). El polyline del mockup se
 *    dibuja sobre 5 waypoints inventados.
 *  - **Geocercas**: DIFERIDO (DA-08).
 *  - **Capas de trafico / POIs / talleres / estaciones**: sin fuente (DA-MV-03).
 *  - **Vista satelital / hibrida**: los tiles ratificados (OSM/CARTO, sin API key) no las tienen.
 *
 * ── EL REALCE SE SUPERPONE, NO REEMPLAZA ──────────────────────────────────────────────────────
 * El **punto** lo pinta `estado` (el estado primario de la entidad) y `realce` entra como **anillo**
 * alrededor. Pisar el relleno borraria la unica lectura del estado primario que el mapa tiene, y son
 * dos preguntas distintas. En Flota: "¿reporta?" y "¿tiene algo abierto?".
 *
 * ── ACCESIBILIDAD ─────────────────────────────────────────────────────────────────────────────
 * Los marcadores son focusables por teclado (Leaflet los crea con `tabindex` cuando `keyboard` esta
 * activo) y llevan su etiqueta en `title`. Aun asi, **el camino accesible de una pantalla de mapa es
 * su panel lateral**, donde cada entidad es un `<button>` real con su texto. Un mapa de tiles no
 * tiene forma de ser la superficie primaria para un lector de pantalla, y fingir que lo es seria
 * peor que declararlo.
 *
 * ⚠️ **`title` solo lleva dato ESTABLE, y no es una eleccion de estilo**: `updateMarker` de
 * react-leaflet actualiza `position`, `icon`, `zIndexOffset`, `opacity` y `draggable` — y nada mas.
 * `title` entra en las opciones **al crear** el marcador y despues no se vuelve a tocar nunca. Meter
 * ahi un dato que cambia dejaria un tooltip congelado en el valor que tenia al aparecer la entidad.
 *
 * ── ⚠️ DESVÍO DEL CONTRATO §4.2, DECIDIDO CONTRA EL CÓDIGO (slice F-02) ───────────────────────
 * §4.2 propone `slotLeyenda` como un slot más, junto a los paneles. **Acá los slots se renderizan
 * FUERA del `<MapContainer>`, dentro del wrapper**, y eso no es un detalle de implementación:
 * `MapaEnVivoPage.tsx` ya montaba la leyenda afuera con un comentario que explica por qué —*"es un
 * overlay del LIENZO, no una capa de Leaflet: adentro del `MapContainer` competiría con los panes
 * por z-index y se movería con el paneo"*—. Meterla adentro para cumplir la letra del contrato
 * reintroduciría un bug ya resuelto y documentado. El slot existe como dice §4.2; lo que cambia es
 * **dónde se monta**. Reportado como drift del slice.
 */

export interface MapaORBIProps<T extends EntidadUbicada> {
  items: readonly T[]
  seleccionadoId: string | null
  onSeleccionar: (id: string) => void
  /** Texto del `title` del marcador. Lo resuelve la pantalla (i18n + fallback). */
  etiquetaDe: (item: T) => string
  /** Clase de color del relleno según `estado`. La aporta el módulo con su vocabulario. */
  claseDeEstado?: (item: T) => string
  /** Clase del anillo según `realce`. La aporta el módulo. */
  claseDeRealce?: (item: T) => string | null
  /** Vista inicial y zoom al seleccionar, con default de plataforma. */
  vista?: { centro: readonly [number, number]; zoom: number }
  /** Slots. El mapa no sabe qué va adentro. Se montan sobre el lienzo, fuera del `MapContainer`. */
  slotPanelLateral?: ReactNode
  slotPanelDetalle?: ReactNode
  slotLeyenda?: ReactNode
}

export function MapaORBI<T extends EntidadUbicada>({
  items,
  seleccionadoId,
  onSeleccionar,
  etiquetaDe,
  claseDeEstado,
  claseDeRealce,
  vista = VISTA_POR_DEFECTO,
  slotPanelLateral,
  slotPanelDetalle,
  slotLeyenda,
}: MapaORBIProps<T>) {
  const seleccionado = items.find((item) => item.id === seleccionadoId) ?? null

  return (
    /*
      Sin `rounded` ni `border`: el lienzo va **a sangre** entre los paneles, que ya aportan su
      borde. Con la caja puesta se leía como una tarjeta de mapa adentro de una página; el mockup lo
      tiene al ras (`.map-canvas-wrap`, `components.css:4086`) y es lo que hace que la pantalla se
      lea como una consola y no como un documento con una figura.
    */
    /*
      ⚠️ SIN `relative`, y es deliberado. El contexto de posicionamiento de los overlays (leyenda,
      vacíos, banners) es el contenedor de la PANTALLA — `<div className="relative min-h-96 flex-1">`
      en el consumidor—, no este wrapper. Agregarle `relative` acá movería el containing block de
      todo lo que se monte por slot y correría su posición. Antes de la extracción este div tampoco
      lo tenía: se conserva tal cual.
    */
    <div className="mapa-orbi h-full w-full overflow-hidden bg-mapa">
      <MapContainer
        center={vista.centro as unknown as LatLngExpression}
        zoom={vista.zoom}
        className="h-full w-full"
        // El scroll del mouse sobre un mapa embebido en una pagina que scrollea secuestra el gesto:
        // el usuario quiere bajar y el mapa hace zoom. Con esto, el zoom es por control o por gesto
        // de dos dedos.
        scrollWheelZoom={false}
        // Los controles propios (`ControlesDelMapa`) reemplazan al nativo: el de Leaflet trae su
        // CSS blanco y sobre un mapa oscuro se ve como un parche. Dos juegos de botones haciendo lo
        // mismo es peor que ninguno.
        zoomControl={false}
      >
        <TileLayer url={appConfig.mapaTilesUrl} attribution={appConfig.mapaTilesAtribucion} />

        <AjusteDeTamano />
        <ControlesDelMapa items={items} />
        <EncuadreInicial items={items} />
        <EnfoqueDelSeleccionado seleccionado={seleccionado} />

        {items.map((item) => (
          <Marker
            key={item.id}
            // `position` y `eventHandlers` se comparan por IDENTIDAD dentro de react-leaflet: un
            // array o un objeto literal escritos aca reescribirian los N marcadores en cada render
            // (y un buscador re-renderiza en cada tecla). Ver el bloque de estabilidad por valor en
            // `geometria.ts`; es el mismo motivo por el que los iconos se cachean.
            position={
              posicionEstable(item.id, item.lat, item.lng) as unknown as LatLngExpression
            }
            icon={iconoDeEntidad(
              claseDeEstado?.(item) ?? '',
              item.id === seleccionadoId,
              claseDeRealce?.(item) ?? null,
            )}
            title={etiquetaDe(item)}
            // El seleccionado se dibuja por encima: sin esto, dos entidades en la misma cuadra dejan
            // la elegida debajo de la otra y el anillo de seleccion no se ve.
            zIndexOffset={item.id === seleccionadoId ? 1000 : 0}
            eventHandlers={manejadoresDelMarcador(item.id, onSeleccionar)}
          >
            {/*
              La etiqueta pegada al pin, como el mockup. Va por `Tooltip` y NO dentro del `divIcon`
              a proposito: el HTML del icono esta cacheado por combinacion de clases, y meterle la
              etiqueta lo volveria una entrada POR ENTIDAD — cada refresco del polling recrearia el
              nodo DOM de los N marcadores. Ver la cache abajo.

              `permanent`: se ve sin hover, que es lo que la hace util de un vistazo. `interactive`
              queda en false (el default) para que el click atraviese la etiqueta y llegue al pin.
            */}
            <Tooltip permanent direction="top" offset={[0, -14]} className="etiqueta-patente">
              {etiquetaDe(item)}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {slotPanelLateral}
      {slotLeyenda}
      {slotPanelDetalle}
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Iconos
 * ------------------------------------------------------------------------- */

/**
 * Cache de iconos por COMBINACION DE CLASES, no por entidad.
 *
 * No es micro-optimizacion: `react-leaflet` llama a `setIcon` cada vez que la prop `icon` cambia de
 * IDENTIDAD, y `setIcon` **recrea el nodo del DOM** del marcador. Construir el icono en cada render
 * haria que cada refresco del polling reemplace los N marcadores enteros — se pierde el foco del
 * teclado, parpadea el anillo de seleccion y se cancela cualquier hover.
 *
 * Por eso tampoco entra la etiqueta en el HTML del icono: haria una entrada de cache por entidad.
 * La etiqueta viaja en el `title` del marcador, que si es una prop barata.
 *
 * ⚠️ **La clave son las CLASES YA RESUELTAS, no los valores crudos de `estado`/`realce`.** Es lo que
 * mantiene la cache acotada por combinacion visual y no por dominio: dos estados distintos que
 * pintan igual comparten entrada, y el mapa no necesita saber cuantos estados existe. La cache es
 * perezosa: solo se crea la combinacion que aparece.
 */
const iconos = new Map<string, DivIcon>()

function iconoDeEntidad(
  claseDeEstado: string,
  seleccionado: boolean,
  claseDeRealce: string | null,
): DivIcon {
  const clave = `${claseDeEstado}|${seleccionado}|${claseDeRealce ?? ''}`
  const cacheado = iconos.get(clave)
  if (cacheado) return cacheado

  const clases = ['marcador']
  if (claseDeEstado !== '') clases.push(claseDeEstado)
  if (seleccionado) clases.push('marcador--seleccionado')
  // El anillo de realce se SUMA al color del estado; con `null` no se agrega nada.
  if (claseDeRealce !== null) clases.push(claseDeRealce)

  const icono = divIcon({
    // `className` REEMPLAZA a `leaflet-div-icon` (el cuadrado blanco con borde del default).
    className: clases.join(' '),
    html: '<span class="marcador__punto"></span>',
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
 * —plegar un panel, abrir otro, cambiar de tamaño la ventana— el mapa queda dibujado a medias:
 * tiles grises en la franja nueva, y el peor sintoma, el **hit-testing corrido** (los clicks caen a
 * varios pixeles del marcador).
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
 * Encuadra **una sola vez**, cuando llegan los primeros marcadores.
 *
 * "Una sola vez" es la parte importante: con polling, re-encuadrar en cada refresco le arrancaria el
 * mapa de las manos al usuario cada vez que una entidad se mueve. Despues del primer encuadre, la
 * camara es del usuario — salvo que elija una entidad.
 */
function EncuadreInicial({ items }: { items: readonly EntidadUbicada[] }) {
  const map = useMap()
  const yaEncuadro = useRef(false)

  useEffect(
    function encuadrarLaPrimeraVez() {
      if (yaEncuadro.current) return

      const limites = limitesDe(items)
      if (limites === null) return

      yaEncuadro.current = true
      map.fitBounds(aBoundsDeLeaflet(limites), {
        padding: [48, 48],
        // Una sola entidad da un rectangulo de area cero: sin tope, Leaflet se va al zoom maximo y
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
 * Centra el mapa en la entidad elegida.
 *
 * El `ref` con el ultimo id es lo que hace que esto sea usable: sin el, cada respuesta del polling
 * volveria a centrar sobre la posicion nueva y el usuario **no podria panear** mientras tuviera algo
 * seleccionado. Se centra al CAMBIAR de entidad, no cuando esa entidad se mueve.
 *
 * `animate` respeta `prefers-reduced-motion`: el reset global de `base.css` apaga las transiciones
 * CSS, pero el paneo de Leaflet lo hace por JS y no lo alcanza.
 */
function EnfoqueDelSeleccionado({ seleccionado }: { seleccionado: EntidadUbicada | null }) {
  const map = useMap()
  const ultimoEnfocado = useRef<string | null>(null)

  useEffect(
    function centrarAlCambiarDeEntidad() {
      if (seleccionado === null) {
        ultimoEnfocado.current = null
        return
      }

      if (ultimoEnfocado.current === seleccionado.id) return
      ultimoEnfocado.current = seleccionado.id

      map.setView([seleccionado.lat, seleccionado.lng], Math.max(map.getZoom(), ZOOM_AL_SELECCIONAR), {
        animate: !prefiereMovimientoReducido(),
      })
    },
    [seleccionado, map],
  )

  return null
}

function prefiereMovimientoReducido(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
