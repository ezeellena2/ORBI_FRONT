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
