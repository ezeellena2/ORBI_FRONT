// ═══════════════════════════════════════════════════════════════════════════
// CAPA 0 DEL FRONTEND
//
// "El conjunto de verificaciones que hacen una violación IMPOSIBLE DE MERGEAR,
//  en vez de detectable por alguien que se acuerde."  — 06-capa-0-frontend.md
//
// Hasta esta pasada el frontend de ORBI tenía CERO verificación automática: el
// job `frontend` del CI del backend nunca corre (evalúa `hashFiles` sobre una
// ruta fuera del workspace, y además `actions/checkout` jamás trae el repo
// hermano), así que aparecía como *skipped* en verde y nadie lo notaba.
// El CI de estas reglas vive en ESTE repo: `.github/workflows/ci.yml`.
//
// Reglas de color: son la MISMA violación escrita de cinco formas
// (F1 hex · F2 primitiva de color · F15 paleta default · F16 clase arbitraria ·
// R10 vocabulario de shadcn). Cerrar cuatro de cinco deja la puerta abierta.
//
// Lo que NO se lintea acá y vive en `scripts/verificar-tokens.mjs`, porque
// ESLint no ve CSS: F1 sobre `.css`, la dirección de las capas de token, F4
// (z-index literal) y F17 (`@theme` sin `inline`, el bug que invalida el
// multi-tema entero sin dejar rastro).
// ═══════════════════════════════════════════════════════════════════════════

import storybook from 'eslint-plugin-storybook'

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

import orbi from './eslint-rules/orbi.js'

/** F10 — el paquete de red, prohibido fuera de `src/services/`. */
const RED = {
  name: 'axios',
  message:
    'F10: el HTTP vive centralizado en services/. Una pantalla que llama a la red por su cuenta se saltea el interceptor de sesión (token, refresh) y el tenant.',
}

export default defineConfig([
  globalIgnores(['dist', 'storybook-static', 'playwright-report', 'test-results', 'coverage']),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },

  // ── Tokens y tema ────────────────────────────────────────────────────────
  // OJO: `src/shared/ui/base/**` NO está excluido de este bloque, y es
  // deliberado. Meter la carpeta que genera el CLI en `ignores` "porque es
  // código de terceros" es la exclusión que se agrega sola — y no es de
  // terceros: shadcn/ui COPIA los componentes al repo y quedan nuestros.
  // Excluirla apagaría F1, F2, F15 y F16 justo en los archivos que más color
  // literal traen de fábrica.
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { orbi },
    rules: {
      'orbi/sin-color-literal': 'error',
      'orbi/sin-primitiva-de-color': 'error',
      'orbi/sin-paleta-default': 'error',
      'orbi/sin-clase-arbitraria-de-color': 'error',
      'orbi/sin-vocabulario-shadcn': 'error',
    },
  },

  // ── Fast refresh en la capa de primitivas de UI ─────────────────────────
  // `react-refresh/only-export-components` exige que un archivo exporte SOLO
  // componentes. La capa de primitivas no puede cumplirlo sin partirse en dos
  // por archivo: los componentes copiados exportan su mapa de variantes de
  // `cva` (`buttonVariants`, `badgeVariants`) y los nuestros exportan helpers
  // puros que solo tienen sentido al lado del componente (`ariaSortDe`,
  // `inicialesDe`, el objeto `toast`).
  //
  // Se apaga acá y SOLO acá, con su costo dicho: editar una primitiva recarga
  // la página entera en dev en vez de hacer hot-reload. Es una regla de DX,
  // no del sistema de diseño — ninguna de las cinco reglas de color se toca.
  {
    files: ['src/shared/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // ── La ÚNICA excepción de las reglas de color, y es de una sola ─────────
  // El vocabulario de shadcn (`bg-primary`, `text-muted-foreground`) es el
  // idioma interno de los archivos que escribió el CLI. Se les deja porque el
  // mapeo a nuestras semánticas se hace DESDE AFUERA (semanticas.css + el
  // puente), y eso es lo que mantiene `shadcn add --overwrite` como un comando
  // en vez de un merge de estilos. Las otras cuatro reglas siguen activas acá.
  {
    files: ['src/shared/ui/base/**/*.{ts,tsx}'],
    rules: { 'orbi/sin-vocabulario-shadcn': 'off' },
  },

  // ── F10 · nadie habla con la red fuera de la capa de servicios ───────────
  // El browser nunca llama a Telemetría, Traccar ni RabbitMQ. Una llamada
  // suelta se saltea el interceptor de sesión y el tenant.
  //
  // NOTA DE ORDEN: en flat config, dos bloques que declaran la MISMA regla no
  // se fusionan — gana el último que matchea. Por eso `RED` se repite dentro
  // de cada bloque de frontera de abajo en vez de vivir sola en éste.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/services/**'],
    rules: {
      'no-restricted-imports': ['error', { paths: [RED] }],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'F10: prohibir el paquete no impide llamar a `window.fetch`. El HTTP se centraliza en services/.',
        },
      ],
    },
  },

  // ── Fronteras entre carpetas (F8, F9) ────────────────────────────────────
  // `src/modules/` está VACÍA hoy, y ese es el mejor momento posible para
  // imponer la frontera: cuesta cero ahora y una refactorización completa seis
  // meses después. Es la única parte de la Capa 0 urgente por calendario.
  {
    files: ['src/modules/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [RED],
          patterns: [
            {
              group: ['@/modules/*', '@/modules/*/**'],
              message:
                'F8: un módulo NUNCA importa de otro módulo. El front replica la frontera del backend (un microservicio por módulo) y los módulos se activan por organización: un import cruzado convierte un módulo opcional en dependencia dura. Si dos módulos necesitan lo mismo, sube a shared/ o se pide por HTTP.',
            },
            {
              group: ['@/features/*', '@/features/*/**'],
              message:
                'F9: la dependencia va hacia adentro. Un módulo consume shared/, services/ y stores/, nunca features/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [RED],
          patterns: [
            {
              group: ['@/modules/*', '@/modules/*/**'],
              message:
                'F9: features/ NUNCA importa de modules/. El shell tiene que compilar con CERO módulos instalados: si el sidebar importa modules/flota, borrar Flota rompe el login. Los módulos se conocen por su manifest, a través de app/registry/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [RED],
          patterns: [
            {
              group: ['@/features/*', '@/features/*/**', '@/modules/*', '@/modules/*/**', '@/app/*', '@/app/*/**'],
              message:
                'F9: shared/ está abajo de todo en el grafo de dependencias, y es la única carpeta que 12 módulos van a tocar a la vez. Si acepta features o dominio, se convierte en el basurero central y cambiar algo ahí rompe módulos al azar.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/services/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/features/*/**', '@/modules/*', '@/modules/*/**', '@/app/*', '@/app/*/**'],
              message:
                'F9: services/ consume shared/ y config/, nada más. La dependencia va hacia adentro.',
            },
          ],
        },
      ],
    },
  },

  ...storybook.configs['flat/recommended'],
])
