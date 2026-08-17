// Base URL de la API. Vacio = rutas relativas (/api/...) contra el MISMO origen del front:
// en dev via el proxy de Vite -> API Gateway; en prod via el borde (nginx/gateway). Ver ADR-0081.
// Una sola base para TODA la API, y por eso no hay una por modulo: quien decide a que
// microservicio va cada request es el gateway, mirando el prefijo de la ruta
// (`/api/flota/*` -> Flota 7213, `/api/plataforma-canonica/*` -> Canonica 7203, `/api/auth/*` ->
// Access 7201). El front no conoce puertos: si aparece uno aca, el gateway dejo de ser el unico
// que rutea y volvemos a tener CORS y cookies cross-site.
const DEFAULT_API_BASE_URL = ''
const DEFAULT_LOCALE = 'es-AR'
const DEFAULT_GOOGLE_CLIENT_ID =
  '644236758922-hbf6kbllem8ljmtamrhbjp1pp8r8m4ap.apps.googleusercontent.com'

/**
 * Tiles del mapa en vivo de Flota.
 *
 * DA-MV-02 la ratifico el PO el 2026-08-13: **Leaflet + tiles OpenStreetMap/CartoDB**, sin API key
 * ni cuenta. Lo unico del mockup que NO se porta es el `<script>` de CDN: `leaflet` y `react-leaflet`
 * entran como dependencias del proyecto.
 *
 * Se elige `dark_all` de CARTO porque es el unico tema EXPUESTO de la app y porque el token
 * `--p-mapa` (el fondo que se ve mientras los tiles cargan) es oscuro: un basemap claro dejaria un
 * flash blanco y un mapa que no pertenece al resto de la pantalla.
 * ⚠️ PENDIENTE: el dia que se exponga un tema claro, esta URL tiene que seguir al tema. No se
 * resuelve preguntandole el tema a un componente (`CLAUDE.md`: ningun componente pregunta cual es el
 * tema) sino moviendo la URL a una variable CSS o a la config del tema. Decide el PO con el 2.º tema.
 *
 * La **atribucion es obligatoria** por la licencia de OpenStreetMap y los terminos de CARTO: no es
 * decoracion y no se saca aunque ocupe lugar.
 */
const DEFAULT_MAPA_TILES_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const DEFAULT_MAPA_TILES_ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export const appConfig = {
  apiBaseUrl: trimTrailingSlash(
    import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  ),
  defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE ?? DEFAULT_LOCALE,
  mapaTilesUrl: import.meta.env.VITE_MAPA_TILES_URL ?? DEFAULT_MAPA_TILES_URL,
  mapaTilesAtribucion:
    import.meta.env.VITE_MAPA_TILES_ATRIBUCION ?? DEFAULT_MAPA_TILES_ATRIBUCION,
  runtimeEnvironment: import.meta.env.MODE,
  googleClientId:
    import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID,
} as const
