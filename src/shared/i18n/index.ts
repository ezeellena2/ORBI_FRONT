import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { appConfig } from '@/config/env'
import enCommon from './locales/en/common.json'
import esArCommon from './locales/es-AR/common.json'

// Solo `common`: es lo unico que el SHELL posee. Cada modulo trae su namespace en su manifiesto y
// lo registra `app/registry/` al arrancar (F-03) — asi este archivo no nombra ningun modulo y
// agregar uno no lo toca. Ver `registrarNamespaceDeModulo` abajo.
const resources = {
  en: { common: enCommon },
  'es-AR': { common: esArCommon },
  es: { common: esArCommon },
} as const

function syncDocumentLanguage(language: string) {
  document.documentElement.lang = language.startsWith('es') ? 'es' : language
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: appConfig.defaultLocale,
    fallbackLng: 'es-AR',
    supportedLngs: ['es-AR', 'es', 'en'],
    nonExplicitSupportedLngs: true,
    defaultNS: 'common',
    ns: ['common'],
    // `fallbackNS` NO es cosmetico: sin el, NINGUN `errors.*` se resuelve dentro de un modulo.
    // react-i18next fija la `t` de `useTranslation(['flota','common'])` al PRIMER namespace y nada
    // mas (`getFixedT(lng, nsMode === 'fallback' ? namespaces : namespaces[0])`, useTranslation.js).
    // Como el catalogo de errores (28 `errors.flota.*` + los `errors.HTTP_*` + `errors.network` +
    // `errors.unexpected`) vive SOLO en `common.json`, `resolveApiErrorMessage` fallaba sus 3
    // primeros intentos y caia a `detail` — que el contrato define como fallback textual, NO como
    // copy de UX (`errores.md` §Contrato de error). Sin `detail` se pintaba la cadena literal
    // `errors.unexpected`, y una caida de red mostraba "Network Error" en ingles crudo.
    //
    // Se arregla aca y no cambiando el namespace de cada call site: los `validation.*` viven en los
    // DOS archivos con contenidos distintos y `resolveApiFieldErrors` DEPENDE de la version de
    // `flota`. Con fallback el orden queda bien (flota primero, common despues) y se verifico que
    // no hay una sola clave homonima con texto distinto entre los 2 namespaces.
    fallbackNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['htmlTag', 'navigator'],
      caches: [],
    },
    react: {
      useSuspense: false,
    },
  })
  .then(() => {
    syncDocumentLanguage(i18n.resolvedLanguage ?? appConfig.defaultLocale)
  })

i18n.on('languageChanged', syncDocumentLanguage)

/**
 * Agrega el namespace de un modulo al catalogo, despues del `init`.
 *
 * ── POR QUE LA REGISTRACION LLEGA DESDE `app/` Y NO SE HACE ACA ───────────────────────────────
 * Porque para conocer los modulos habria que importarlos, y **F9 le prohibe a `shared/` importar
 * `@/modules/*` y `@/app/*`** (`eslint.config.js`). `app/registry/` es la unica capa que ve las dos,
 * asi que empuja los recursos para aca.
 *
 * ⚠️ **El orden de arranque es lo que lo hace funcionar, y conviene no romperlo**: `main.tsx`
 * importa `@/shared/i18n` (corre el `init`) y RECIEN DESPUES `App` -> `AppRouter` -> `app/registry`,
 * que llama a esta funcion. O sea: registrado antes del primer render, despues del init.
 * `addResourceBundle` sobre un i18next ya inicializado es soportado y no re-dispara la deteccion.
 */
export function registrarNamespaceDeModulo(
  namespace: string,
  recursos: Record<string, Record<string, unknown>>,
): void {
  for (const [idioma, bundle] of Object.entries(recursos)) {
    i18n.addResourceBundle(idioma, namespace, bundle, true, true)
  }
}

export default i18n
