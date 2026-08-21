import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setupSessionBridge } from '@/services/session/setup-session-bridge'
import '@/shared/i18n'
// Los namespaces i18n de los modulos, DESPUES del init de arriba y antes del primer render.
// Van aca y no en `shared/i18n` porque ese archivo no puede importar `modules/` (F9).
import { registrarI18nDeModulos } from '@/app/registry/i18n'
// `base.css` es el ÚNICO archivo de estilos que la app importa: adentro están
// `@import "tailwindcss"`, las 3 capas de token y el puente `@theme inline`.
import '@/styles/base.css'
import App from './app/App'

// Conectar el bridge de sesion al store — antes de que React arranque
setupSessionBridge()

registrarI18nDeModulos()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
