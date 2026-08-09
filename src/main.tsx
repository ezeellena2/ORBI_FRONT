import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setupSessionBridge } from '@/services/session/setup-session-bridge'
import '@/shared/i18n'
// `base.css` es el ÚNICO archivo de estilos que la app importa: adentro están
// `@import "tailwindcss"`, las 3 capas de token y el puente `@theme inline`.
import '@/styles/base.css'
import App from './app/App'

// Conectar el bridge de sesion al store — antes de que React arranque
setupSessionBridge()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
