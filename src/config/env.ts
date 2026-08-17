// Base URL de la API. Vacio = rutas relativas (/api/...) contra el MISMO origen del front:
// en dev via el proxy de Vite -> API Gateway; en prod via el borde (nginx/gateway). Ver ADR-0081.
const DEFAULT_API_BASE_URL = ''
const DEFAULT_ACCESS_API_BASE_URL = 'https://localhost:7201'
// Cada modulo de negocio tiene su propio backend duenio y su propio puerto: Flota es 7212/7213 y
// PlataformaCanonica 7203 (registro en TracAutoV2 `_puertos-asignados.md`). Sin base URL propia, una
// llamada de Flota saldria contra Access y devolveria 404 sin que nadie entienda por que.
const DEFAULT_FLOTA_API_BASE_URL = 'https://localhost:7213'
const DEFAULT_CANONICA_API_BASE_URL = 'https://localhost:7203'
const DEFAULT_LOCALE = 'es-AR'
const DEFAULT_GOOGLE_CLIENT_ID =
  '644236758922-hbf6kbllem8ljmtamrhbjp1pp8r8m4ap.apps.googleusercontent.com'

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export const appConfig = {
  apiBaseUrl: trimTrailingSlash(
    import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  ),
  accessApiBaseUrl: trimTrailingSlash(
    import.meta.env.VITE_ACCESS_API_BASE_URL ?? DEFAULT_ACCESS_API_BASE_URL,
  ),
  flotaApiBaseUrl: trimTrailingSlash(
    import.meta.env.VITE_FLOTA_API_BASE_URL ?? DEFAULT_FLOTA_API_BASE_URL,
  ),
  canonicaApiBaseUrl: trimTrailingSlash(
    import.meta.env.VITE_CANONICA_API_BASE_URL ?? DEFAULT_CANONICA_API_BASE_URL,
  ),
  defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE ?? DEFAULT_LOCALE,
  runtimeEnvironment: import.meta.env.MODE,
  googleClientId:
    import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID,
} as const
