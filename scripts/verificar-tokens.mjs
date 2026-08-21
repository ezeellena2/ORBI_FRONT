#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CAPA 0 — la mitad que ESLint no puede ver
 *
 * ESLint no parsea CSS, y las reglas más caras del sistema viven justamente
 * ahí. Este script cubre:
 *
 *   F1   Color literal fuera de `src/styles/primitivas.css`, en archivos `.css`.
 *   F2a  `var(--token)` a un token que NO está declarado en ningún lado.
 *        CSS es tolerante por diseño: `var(--no-existe)` no rompe, hereda. Es
 *        el modo de falla más caro del sistema porque no deja rastro.
 *   F2b  Dirección de las capas: una primitiva de color (`--p-*`) solo se
 *        consume desde `semanticas.css` o `temas/`.
 *   F4   `z-index` literal en CSS. La banda tokenizada es 1010–1050; un `9999`
 *        suelto gana siempre y rompe el orden de capas.
 *   F17  Un token DEPENDIENTE DEL TEMA declarado en un `@theme` sin `inline`.
 *        Es el bug más caro posible: se construye el multi-tema entero, se
 *        cambia `data-theme`… y no pasa nada. Sin error, sin warning, sin una
 *        clase rota. Se descubre meses después, al activar el segundo tema.
 *   +    Los 3 chequeos "por proyecto" del checklist de `01` §9: que exista la
 *        variante `dark` custom, que la paleta default esté apagada, y que el
 *        reset venga ANTES del puente (un reset borra lo declarado antes: al
 *        revés se lleva puesto nuestro propio tema).
 *
 * Uso: `node scripts/verificar-tokens.mjs`  ·  sale con 1 si hay violaciones.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const SRC = join(RAIZ, 'src')

/** El ÚNICO archivo del frontend con permiso de contener un hex (01 §7.5). */
const ARCHIVO_DE_PRIMITIVAS = join('src', 'styles', 'primitivas.css')
const CARPETA_ESTILOS = join('src', 'styles')
const ARCHIVO_PUENTE = join('src', 'styles', 'base.css')

const problemas = []

function reportar(archivo, linea, regla, mensaje) {
  problemas.push({ archivo, linea, regla, mensaje })
}

function archivos(dir, extensiones) {
  const salida = []
  for (const entrada of readdirSync(dir)) {
    if (entrada === 'node_modules') continue
    const ruta = join(dir, entrada)
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta, extensiones))
    else if (extensiones.some((e) => entrada.endsWith(e))) salida.push(ruta)
  }
  return salida
}

const rel = (ruta) => relative(RAIZ, ruta)
const css = archivos(SRC, ['.css'])
const codigo = archivos(SRC, ['.ts', '.tsx'])

/**
 * Devuelve las líneas del archivo con los COMENTARIOS en blanco, conservando la
 * numeración. Un hex citado en un comentario que explica por qué no se usa un
 * hex no es una fuga: hacerlo fallar es exactamente cómo una regla de lint
 * pierde credibilidad y el equipo aprende a ignorarla.
 */
function lineasSinComentarios(ruta) {
  const enBlanco = (m) => m.replace(/[^\n]/g, ' ')
  return readFileSync(ruta, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, enBlanco)
    .replace(/(^|[^:])(\/\/[^\n]*)/g, (_m, previo, comentario) => previo + enBlanco(comentario))
    .split('\n')
}

/* ── F1 · color literal en CSS ──────────────────────────────────────────── */
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lch|lab)\s*\(/

for (const ruta of css) {
  if (rel(ruta) === ARCHIVO_DE_PRIMITIVAS) continue
  lineasSinComentarios(ruta).forEach((linea, i) => {
    const m = linea.match(COLOR_LITERAL)
    if (m) {
      reportar(
        rel(ruta),
        i + 1,
        'F1',
        `color literal "${m[0]}". El único archivo con permiso de tener un hex es ${ARCHIVO_DE_PRIMITIVAS}. Un literal acá no cambia con \`data-theme\`.`
      )
    }
  })
}

/* ── F4 · z-index literal en CSS ────────────────────────────────────────── */
for (const ruta of css) {
  if (rel(ruta).startsWith(CARPETA_ESTILOS)) continue
  lineasSinComentarios(ruta).forEach((linea, i) => {
    if (/z-index\s*:\s*-?\d+/.test(linea)) {
      reportar(
        rel(ruta),
        i + 1,
        'F4',
        'z-index literal. La banda tokenizada es --z-base/dropdown/popover/sticky/velo/modal/toast. Se consume con `z-(--z-modal)`.'
      )
    }
  })
}

/* ── Recolección de tokens declarados ───────────────────────────────────── */
const declarados = new Set()
for (const ruta of css) {
  for (const linea of lineasSinComentarios(ruta)) {
    for (const m of linea.matchAll(/(^|[;{\s])(--[a-zA-Z0-9-]+)\s*:/g)) declarados.add(m[2])
  }
}
// Variables que Tailwind emite por su cuenta y que los componentes copiados
// leen legítimamente desde una clase arbitraria.
for (const t of ['--spacing', '--radius-3xl', '--radius-4xl', '--transform-origin']) {
  declarados.add(t)
}

/* ── F2a · `var()` a token inexistente ──────────────────────────────────── */
for (const ruta of [...css, ...codigo]) {
  const relativo = rel(ruta)
  lineasSinComentarios(ruta).forEach((linea, i) => {
    for (const m of linea.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
      const token = m[1]
      if (token.startsWith('--tw-')) continue // inyectadas por Tailwind en runtime
      if (declarados.has(token)) continue
      reportar(
        relativo,
        i + 1,
        'F2',
        `\`var(${token})\` no está declarado en ninguna capa. CSS no falla ante una variable inexistente: hereda o cae al valor inicial, y el bug es invisible.`
      )
    }
  })
}

/* ── F2b · dirección de las capas ───────────────────────────────────────── */
const PUEDEN_LEER_PRIMITIVAS = [
  join('src', 'styles', 'primitivas.css'),
  join('src', 'styles', 'semanticas.css'),
  join('src', 'styles', 'temas') + sep,
  // Una ESTÉTICA remapea la capa semántica leyendo primitivas, igual que un tema: por eso está
  // acá y no es una excepción. La carpeta todavía no existe — la crea el slice de estéticas
  // (`TracAutoV2/docsv2/02-arquitectura/frontend/11-catalogo-de-esteticas.md`) — y se agrega ANTES
  // a propósito: sin esta línea, el primer `var(--p-*)` de la primera estética falla F2 y deja el
  // CI en rojo con un mensaje que apunta a la regla equivocada.
  join('src', 'styles', 'esteticas') + sep,
]

for (const ruta of [...css, ...codigo]) {
  const relativo = rel(ruta)
  if (PUEDEN_LEER_PRIMITIVAS.some((p) => relativo.startsWith(p))) continue
  lineasSinComentarios(ruta).forEach((linea, i) => {
    if (/var\(\s*--p-/.test(linea)) {
      reportar(
        relativo,
        i + 1,
        'F2',
        'lee una PRIMITIVA de color (`--p-*`). Una primitiva describe un color, no una intención: no se puede re-apuntar por tema. Solo la capa semántica la consume.'
      )
    }
  })
}

/* ── F17 · `@theme` sin `inline` para tokens del tema ───────────────────── */
const lineasPuente = lineasSinComentarios(join(RAIZ, ARCHIVO_PUENTE))
const puenteCrudo = readFileSync(join(RAIZ, ARCHIVO_PUENTE), 'utf8')

let profundidad = 0
let bloque = null // 'inline' | 'plano' | null
let posResetPaleta = -1
let posPuenteInline = -1

lineasPuente.forEach((linea, i) => {
  if (profundidad === 0) {
    const abre = linea.match(/@theme(\s+inline)?\s*\{/)
    if (abre) {
      bloque = abre[1] ? 'inline' : 'plano'
      profundidad = 1
      if (bloque === 'inline' && posPuenteInline === -1) posPuenteInline = i
    }
    return
  }

  profundidad += (linea.match(/\{/g) ?? []).length
  profundidad -= (linea.match(/\}/g) ?? []).length

  if (/--color-\*\s*:\s*initial/.test(linea) && posResetPaleta === -1) posResetPaleta = i

  if (bloque === 'plano' && /:\s*[^;]*var\(\s*--[sp]-/.test(linea)) {
    reportar(
      ARCHIVO_PUENTE,
      i + 1,
      'F17',
      'token dependiente del tema dentro de un `@theme` SIN `inline`. Sin `inline` la indirección se resuelve en `:root` y el cambio de `data-theme` NO OCURRE — sin error, sin warning, sin nada en consola.'
    )
  }

  if (profundidad <= 0) {
    profundidad = 0
    bloque = null
  }
})

/* ── Chequeos por proyecto del checklist de `01` §9 ─────────────────────── */
if (posPuenteInline === -1) {
  reportar(ARCHIVO_PUENTE, 1, 'F17', 'no existe ningún bloque `@theme inline`: no hay puente.')
}
if (posResetPaleta === -1) {
  reportar(
    ARCHIVO_PUENTE,
    1,
    'F15',
    'falta `--color-*: initial`. Con la paleta default encendida, `bg-slate-800` se ve casi igual que `bg-superficie-1`, pasa cualquier review y no lo detecta ningún grep de hex.'
  )
} else if (posPuenteInline !== -1 && posResetPaleta > posPuenteInline) {
  reportar(
    ARCHIVO_PUENTE,
    posResetPaleta + 1,
    'F15',
    '`--color-*: initial` va ANTES del puente. Un reset borra lo declarado antes: así se lleva puestas nuestras propias definiciones.'
  )
}
if (!/@custom-variant\s+dark\s*\(/.test(puenteCrudo)) {
  reportar(
    ARCHIVO_PUENTE,
    1,
    'F6',
    'falta `@custom-variant dark (…)`. La variante `dark:` de fábrica de Tailwind v4 mira `prefers-color-scheme` —el sistema operativo—, no `data-theme`.'
  )
}

/* ── Salida ─────────────────────────────────────────────────────────────── */
if (problemas.length === 0) {
  console.log('OK  Capa 0 - tokens y tema: sin violaciones (F1 css . F2 . F4 . F6 . F15 . F17)')
  process.exit(0)
}

console.error(`\nX  Capa 0 - tokens y tema: ${problemas.length} violacion(es)\n`)
for (const p of problemas) {
  console.error(`  ${p.archivo}:${p.linea}  [${p.regla}] ${p.mensaje}`)
}
console.error('')
process.exit(1)
