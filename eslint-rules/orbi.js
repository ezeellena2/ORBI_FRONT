/**
 * Capa 0 del frontend — las reglas de ORBI que corren sobre `.ts` / `.tsx`.
 * Catálogo y porqué de cada una: `06-capa-0-frontend.md` §2 (`F1`–`F18`).
 *
 * Criterio de admisión heredado de `orbi-lint`: solo entra un patrón donde una
 * coincidencia ES un defecto. Una regla que dispara cientos de veces y nunca
 * atrapa un bug entrena a todo el equipo a ignorar el lint.
 *
 * Las cinco reglas de color son la MISMA violación —color que no pasa por la
 * capa de tokens— escrita de cinco formas. Por eso las cinco tienen que
 * existir: cerrar cuatro de cinco deja la puerta abierta con el cartel puesto.
 *
 * Alcance: se inspeccionan literales de string y template strings, NO los
 * comentarios. Un hex citado en un comentario que explica por qué no se usa un
 * hex no es una fuga; hacerlo fallar es cómo una regla pierde credibilidad.
 */

/** Devuelve todos los strings "de código" de un archivo, con su nodo. */
function visitantesDeString(handler) {
  return {
    Literal(node) {
      if (typeof node.value === 'string') handler(node.value, node)
    },
    TemplateElement(node) {
      const texto = node.value?.cooked ?? node.value?.raw
      if (typeof texto === 'string') handler(texto, node)
    },
    JSXText(node) {
      if (typeof node.value === 'string') handler(node.value, node)
    },
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * F1 · Color literal fuera de `src/styles/primitivas.css`
 * ───────────────────────────────────────────────────────────────────────────── */
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lch|lab)\s*\(/

const sinColorLiteral = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'F1 — un color literal (#hex, rgb(), hsl(), oklch()) no cambia con `data-theme`: el tema se rompe en silencio, no con un error. El único archivo del frontend con permiso de contener un hex es src/styles/primitivas.css.',
    },
    schema: [],
    messages: {
      colorLiteral:
        'F1: color literal "{{valor}}". Un literal no cambia con `data-theme` y congela este componente en el tema actual. Usá una utilidad semántica (bg-superficie-1, text-fg-primario…). El único archivo con permiso de tener un hex es src/styles/primitivas.css.',
    },
  },
  create(context) {
    return visitantesDeString((texto, node) => {
      const encontrado = texto.match(COLOR_LITERAL)
      if (encontrado) {
        context.report({ node, messageId: 'colorLiteral', data: { valor: encontrado[0] } })
      }
    })
  },
}

/* ─────────────────────────────────────────────────────────────────────────────
 * F2 (parte) · Primitiva de color leída desde un componente
 * ───────────────────────────────────────────────────────────────────────────── */
const sinPrimitivaDeColor = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'F2 — una primitiva de color (--p-*) describe un color, no una intención: no se puede re-apuntar por tema. Leerla desde un componente saltea la capa semántica y es un bug del mismo peso que un hex suelto.',
    },
    schema: [],
    messages: {
      primitiva:
        'F2: `var(--p-…)` en un componente. Las primitivas de color solo las lee la capa semántica (src/styles/semanticas.css y temas/). Un componente consume SEMÁNTICAS, y las consume por utilidad de Tailwind.',
    },
  },
  create(context) {
    return visitantesDeString((texto, node) => {
      if (texto.includes('var(--p-')) context.report({ node, messageId: 'primitiva' })
    })
  },
}

/* ─────────────────────────────────────────────────────────────────────────────
 * F15 · Utilidad de la paleta default de Tailwind
 * ───────────────────────────────────────────────────────────────────────────── */
const HUES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
  'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
  'purple', 'fuchsia', 'pink', 'rose',
]
const PREFIJOS_COLOR = [
  'bg', 'text', 'border', 'ring', 'fill', 'stroke', 'from', 'via', 'to', 'divide',
  'outline', 'shadow', 'accent', 'caret', 'decoration', 'placeholder',
]
const PALETA_DEFAULT = new RegExp(
  `(?<![\\w-])(?:${PREFIJOS_COLOR.join('|')})-(?:black|white|(?:${HUES.join('|')})-(?:50|100|200|300|400|500|600|700|800|900|950))(?![\\w-])`
)

const sinPaletaDefault = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'F15 — la paleta default de Tailwind está apagada (--color-*: initial). Estas clases no generan nada: se renderizan SIN color y nadie se entera hasta que alguien mira la pantalla.',
    },
    schema: [],
    messages: {
      paleta:
        'F15: "{{valor}}" es de la paleta default de Tailwind, que está APAGADA. No genera ninguna regla: el elemento queda sin ese color y no hay error. Usá la utilidad semántica equivalente.',
    },
  },
  create(context) {
    return visitantesDeString((texto, node) => {
      const encontrado = texto.match(PALETA_DEFAULT)
      if (encontrado) {
        context.report({ node, messageId: 'paleta', data: { valor: encontrado[0] } })
      }
    })
  },
}

/* ─────────────────────────────────────────────────────────────────────────────
 * F16 · Clase arbitraria con color — la fuga más peligrosa
 * ───────────────────────────────────────────────────────────────────────────── */
const CLASE_ARBITRARIA_COLOR =
  /\[[^\]]*(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|oklch\(|oklab\(|lch\(|lab\(|var\(--p-)[^\]]*\]/

const sinClaseArbitrariaDeColor = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'F16 — `bg-[#06B6D4]` compila, no advierte nada y se ve perfecto en el tema actual. El bug aparece el día que se activa el segundo tema, meses después, sin ninguna pista de dónde salió. Ni F1 ni F15 la cazan cuando el valor viaja por var().',
    },
    schema: [],
    messages: {
      arbitraria:
        'F16: clase arbitraria con color "{{valor}}". Compila, no advierte y se ve bien HOY; rompe el día que se cambie de tema. Usá la utilidad del puente (bg-marca, text-fg-primario…) o pedí el token si no existe.',
    },
  },
  create(context) {
    return visitantesDeString((texto, node) => {
      const encontrado = texto.match(CLASE_ARBITRARIA_COLOR)
      if (encontrado) {
        context.report({ node, messageId: 'arbitraria', data: { valor: encontrado[0] } })
      }
    })
  },
}

/* ─────────────────────────────────────────────────────────────────────────────
 * R10 · El vocabulario de shadcn es el idioma INTERNO de los archivos copiados
 * ───────────────────────────────────────────────────────────────────────────── */
const NOMBRES_SHADCN = [
  'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground',
  'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted',
  'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'destructive-foreground',
  'border', 'input', 'ring',
]
const VOCABULARIO_SHADCN = new RegExp(
  `(?<![\\w-])(?:${PREFIJOS_COLOR.join('|')})-(?:${NOMBRES_SHADCN.join('|')})(?![\\w-])`
)

const sinVocabularioShadcn = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'R10 — el vocabulario de shadcn (bg-background, text-muted-foreground, border-input…) es el idioma interno de los archivos que copió el CLI, y de nadie más. Si se filtra al resto del repo existen dos nombres para el mismo color y "solo semánticas ORBI" deja de ser arquitectura.',
    },
    schema: [],
    messages: {
      vocabulario:
        'R10: "{{valor}}" es vocabulario de shadcn/ui y solo puede aparecer dentro de src/shared/ui/base/. Acá se escribe la utilidad de ORBI (bg-fondo-base, text-fg-terciario…). Tabla de equivalencias en 02-primitivas.md §1.4.',
    },
  },
  create(context) {
    return visitantesDeString((texto, node) => {
      const encontrado = texto.match(VOCABULARIO_SHADCN)
      if (encontrado) {
        context.report({ node, messageId: 'vocabulario', data: { valor: encontrado[0] } })
      }
    })
  },
}

export default {
  meta: { name: 'orbi', version: '1.0.0' },
  rules: {
    'sin-color-literal': sinColorLiteral,
    'sin-primitiva-de-color': sinPrimitivaDeColor,
    'sin-paleta-default': sinPaletaDefault,
    'sin-clase-arbitraria-de-color': sinClaseArbitrariaDeColor,
    'sin-vocabulario-shadcn': sinVocabularioShadcn,
  },
}
