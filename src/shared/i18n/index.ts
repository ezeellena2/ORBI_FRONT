import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { appConfig } from '@/config/env'
import enCommon from './locales/en/common.json'
import esArCommon from './locales/es-AR/common.json'
import enFlota from './locales/en/flota.json'
import esArFlota from './locales/es-AR/flota.json'

// Un namespace por area funcional: cada modulo de negocio trae el suyo y no engorda `common`.
const resources = {
  en: {
    common: enCommon,
    flota: enFlota,
  },
  'es-AR': {
    common: esArCommon,
    flota: esArFlota,
  },
  es: {
    common: esArCommon,
    flota: esArFlota,
  },
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
    ns: ['common', 'flota'],
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

export default i18n
