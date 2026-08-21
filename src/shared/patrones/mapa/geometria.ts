/**
 * La maquinaria del mapa que NO toca Leaflet — encuadre, estabilidad por valor y constantes.
 *
 * ⚠️ **Este archivo NO importa `leaflet` ni `react-leaflet`, y es a propósito.** El proyecto `unit`
 * de Vitest corre con `environment: 'node'`, y Leaflet toca `window` al cargarse: un import acá
 * pondría el runner en rojo. Todo lo que se puede probar vive en este archivo; lo que necesita el
 * mapa real vive en `MapaORBI.tsx`, que ningún test importa.
 *
 * ── DE DÓNDE SALIÓ ────────────────────────────────────────────────────────────────────────────
 * Estas funciones vivían en `modules/flota/vocabulario-mapa.ts`. Son genéricas —no saben qué es un
 * vehículo— y el contrato ya las declaraba así (`07-capa-compartida.md` §4.1: "encuadre automático"
 * y "posición estable" en la columna de lo genérico), pero estaban dentro de un archivo de
 * vocabulario del módulo, que la lista de archivos a mover no incluía. Extraídas en el slice F-02.
 */

/** Lo mínimo que el mapa necesita saber de una entidad para dibujarla. */
export interface EntidadUbicada {
  id: string
  lat: number
  lng: number
  /** Estado primario del punto: pinta el RELLENO del marcador. */
  estado?: string | null
  /** Estado secundario: pinta un ANILLO alrededor, sin tapar el relleno. */
  realce?: string | null
}

/** Zoom al que se acerca el mapa cuando se selecciona una entidad. */
export const ZOOM_AL_SELECCIONAR = 15

/**
 * Vista por defecto cuando todavía no hay ningún marcador que encuadrar.
 *
 * Coordenadas de **Buenos Aires**, no del centro geográfico del país. Con `zoom: 5` la vista abarca
 * casi toda la Argentina igual, y este encuadre dura milisegundos: apenas llega el primer marcador,
 * el encuadre automático hace `fitBounds`. Un módulo que opere en otra región la pisa con la prop
 * `vista`.
 */
export const VISTA_POR_DEFECTO = { centro: [-34.6, -58.44] as const, zoom: 5 }

/* ---------------------------------------------------------------------------
 * Encuadre
 * ------------------------------------------------------------------------- */

/** Rectángulo `[[sur, oeste], [norte, este]]`, en el shape que Leaflet acepta como `LatLngBounds`. */
export type LimitesDelMapa = readonly [readonly [number, number], readonly [number, number]]

/**
 * Rectángulo que contiene a todos los marcadores, o `null` si no hay ninguno.
 *
 * Se devuelve como tupla de números y no como `L.LatLngBounds` para que este archivo siga sin
 * importar Leaflet (ver el encabezado): quien lo consume ya está dentro del mapa.
 */
export function limitesDe(items: readonly EntidadUbicada[]): LimitesDelMapa | null {
  if (items.length === 0) return null

  let sur = Number.POSITIVE_INFINITY
  let norte = Number.NEGATIVE_INFINITY
  let oeste = Number.POSITIVE_INFINITY
  let este = Number.NEGATIVE_INFINITY

  for (const item of items) {
    if (item.lat < sur) sur = item.lat
    if (item.lat > norte) norte = item.lat
    if (item.lng < oeste) oeste = item.lng
    if (item.lng > este) este = item.lng
  }

  return [
    [sur, oeste],
    [norte, este],
  ]
}

/* ---------------------------------------------------------------------------
 * Estabilidad por VALOR de las props del marcador
 *
 * `react-leaflet` compara las props del `<Marker>` por IDENTIDAD, no por valor
 * (`react-leaflet/lib/Marker.js`: `if (props.position !== prevProps.position) marker.setLatLng(...)`;
 * `@react-leaflet/core/lib/events.js`: el efecto lleva `eventHandlers` en sus deps). Un
 * `position={[lat, lng]}` escrito en el JSX es un array NUEVO en cada render, y un
 * `eventHandlers={{ click: ... }}` es un objeto nuevo: con eso, **cada** render reescribe los N
 * marcadores (`setLatLng` proyecta a layer-point y escribe el `transform` en el DOM; el `off/on`
 * desengancha y vuelve a enganchar el listener), aunque no se haya movido nada.
 *
 * Y el disparador no es solo el polling: un buscador que escribe al store en cada tecla hacía que
 * tipear 8 caracteres sobre 200 entidades diera 1.600 reescrituras.
 *
 * Es el MISMO problema que la caché de íconos de `MapaORBI` resuelve, en las otras dos props. Las
 * cachés viven acá —y no en el componente— porque acá se pueden anclar por test: el archivo no
 * importa Leaflet y el runner corre en Node.
 *
 * ⚠️ **No se usa `useMemo`**, que este repo prohíbe (y el compilador de React que lo reemplazaría
 * **no está instalado**: `vite.config.ts` solo tiene `react()` + `tailwindcss()`). Son cachés de
 * módulo acotadas por la cantidad de entidades: una entrada por id, reemplazada —no acumulada—
 * cuando la entidad se mueve o cambia el callback.
 * ------------------------------------------------------------------------- */

const posicionesEstables = new Map<string, readonly [number, number]>()

/** La MISMA tupla mientras la entidad no se mueva. */
export function posicionEstable(
  id: string,
  lat: number,
  lng: number,
): readonly [number, number] {
  const guardada = posicionesEstables.get(id)
  if (guardada !== undefined && guardada[0] === lat && guardada[1] === lng) return guardada

  const nueva = [lat, lng] as const
  posicionesEstables.set(id, nueva)
  return nueva
}

/** Lo que Leaflet acepta como mapa de handlers; se tipa estructural para no importar Leaflet acá. */
export interface ManejadoresDelMarcador {
  readonly click: () => void
}

interface EntradaDeManejadores {
  readonly onSeleccionar: (id: string) => void
  readonly manejadores: ManejadoresDelMarcador
}

const manejadoresEstables = new Map<string, EntradaDeManejadores>()

/**
 * El MISMO objeto de handlers mientras no cambie ni la entidad ni el callback.
 *
 * Se compara el callback en vez de asumirlo estable: hoy suele ser la acción de un store de zustand
 * (que no cambia de identidad), pero un `onSeleccionar={() => …}` inline en el futuro dejaría
 * handlers apuntando al render viejo, que es un bug mucho más caro que el churn que esto evita.
 */
export function manejadoresDelMarcador(
  id: string,
  onSeleccionar: (id: string) => void,
): ManejadoresDelMarcador {
  const guardada = manejadoresEstables.get(id)
  if (guardada !== undefined && guardada.onSeleccionar === onSeleccionar) return guardada.manejadores

  const manejadores: ManejadoresDelMarcador = { click: () => onSeleccionar(id) }
  manejadoresEstables.set(id, { onSeleccionar, manejadores })
  return manejadores
}
