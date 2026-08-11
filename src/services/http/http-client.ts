import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios'
import { appConfig } from '@/config/env'
import i18n from '@/shared/i18n'
import { getHttpSessionBridge } from '@/services/session/http-session-bridge'

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _tracautoRetried?: boolean
}

let refreshPromise: Promise<string | null> | null = null

// Un unico reintento cubre la carrera multi-pestaña: si dos pestañas refrescan a la vez, el backend
// rota el refresh token de forma single-use (ver backend CONC-01) y la pestaña que pierde recibe 401.
// Para entonces la ganadora ya dejo en la cookie un refresh token nuevo y valido, asi que un segundo
// intento —tras un breve respiro para que aterrice el Set-Cookie— lo usa y recupera la sesion sin
// desloguear. Si el segundo intento tambien falla, la sesion esta genuinamente muerta.
const REFRESH_RETRY_DELAY_MS = 150

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function refreshWithRetry(
  refreshSession: () => Promise<string | null>,
): Promise<string | null> {
  const firstAttempt = await refreshSession()
  if (firstAttempt) {
    return firstAttempt
  }

  await delay(REFRESH_RETRY_DELAY_MS)
  return refreshSession()
}

function attachHeaders(
  config: InternalAxiosRequestConfig,
  accessToken: string | null,
) {
  const headers = AxiosHeaders.from(config.headers)
  headers.set('Accept', 'application/json')
  // Accept-Language coherente con la UI: el backend localiza el fallback title/detail de ProblemDetails
  // por este header (backend I18N-03). Sin el, ese fallback saldria en el idioma default del backend.
  headers.set('Accept-Language', i18n.resolvedLanguage ?? appConfig.defaultLocale)
  // `X-Client-Type`, NO `X-TracAuto-Client`. El header viejo no lo leia NADIE en el backend y no
  // estaba en la whitelist de CORS (`Platform.Web/OrbiAuthExtensions.cs`: Content-Type,
  // Authorization, X-Client-Type, X-orbi-Client), asi que el PREFLIGHT lo rechazaba y **todos** los
  // requests morian con `net::ERR_FAILED` — la app entera mostraba "No se pudo conectar con el
  // servidor" contra un backend sano. `X-Client-Type` esta whitelisteado y ademas TIENE lector
  // (`AuthController` compara contra `mobile` para el flujo de refresh); mandar `web` deja ese
  // branch igual que con el header ausente.
  headers.set('X-Client-Type', 'web')

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  } else {
    headers.delete('Authorization')
  }

  config.headers = headers
  return config
}

export const httpClient = axios.create({
  baseURL: appConfig.accessApiBaseUrl,
  timeout: 15_000,
  withCredentials: true,
})

httpClient.interceptors.request.use((config) => {
  const token = getHttpSessionBridge().getAccessToken()
  return attachHeaders(config, token)
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const requestConfig = error.config as RetriableRequestConfig | undefined

    if (!requestConfig || !error.response) {
      return Promise.reject(error)
    }

    if (
      error.response.status !== 401 ||
      requestConfig._tracautoRetried ||
      requestConfig.url?.includes('/api/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    const bridge = getHttpSessionBridge()

    if (!bridge.refreshSession) {
      bridge.clearSession?.()
      return Promise.reject(error)
    }

    refreshPromise ??= refreshWithRetry(bridge.refreshSession).finally(() => {
      refreshPromise = null
    })

    try {
      const nextAccessToken = await refreshPromise

      if (!nextAccessToken) {
        bridge.clearSession?.()
        return Promise.reject(error)
      }

      requestConfig._tracautoRetried = true
      return httpClient(attachHeaders(requestConfig, nextAccessToken))
    } catch (refreshError) {
      bridge.clearSession?.()
      return Promise.reject(refreshError)
    }
  },
)
