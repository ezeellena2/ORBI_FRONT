/**
 * Capa 0 — paridad de i18n entre idiomas.
 *
 * Una clave que existe en un idioma y no en el otro NO falla en ningún gate: compila, lintea y
 * buildea igual. El único que se entera es el usuario, que ve la clave cruda
 * (`shell.nav.flotaDispositivos`) en pantalla.
 *
 * No es hipotético: `en/common.json` estuvo sin el bloque `shell.*` ENTERO (~105 claves: nav,
 * sidebar, header, dashboard, onboarding), así que un usuario en inglés veía las claves crudas en
 * todo el menú lateral. Nadie lo detectó hasta que un agente contó las claves a mano.
 *
 * Este verificador compara los ÁRBOLES DE HOJAS de cada namespace entre todos los idiomas, tomando
 * `es-AR` como referencia (es el idioma en el que se escribe primero).
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = path.join(raiz, 'src', 'shared', 'i18n', 'locales')
const REFERENCIA = 'es-AR'

/**
 * Devuelve las rutas de las HOJAS del objeto (`a.b.c`), no las ramas.
 *
 * Un array cuenta como UNA hoja: i18next devuelve el array entero como valor (`returnObjects`), así
 * que dos idiomas con distinta cantidad de elementos no son un desajuste de claves. Recursar dentro
 * generaría `a.0`, `a.1` y reportaría un falso positivo cada vez que una lista tenga otro largo.
 */
function hojas(obj, prefijo = '') {
  return Object.entries(obj).flatMap(([clave, valor]) =>
    valor && typeof valor === 'object' && !Array.isArray(valor)
      ? hojas(valor, `${prefijo}${clave}.`)
      : [`${prefijo}${clave}`],
  )
}

function leer(idioma, archivo) {
  return JSON.parse(fs.readFileSync(path.join(base, idioma, archivo), 'utf8'))
}

const idiomas = fs.readdirSync(base).filter((d) => fs.statSync(path.join(base, d)).isDirectory())
const otros = idiomas.filter((i) => i !== REFERENCIA)
const namespaces = fs.readdirSync(path.join(base, REFERENCIA)).filter((f) => f.endsWith('.json'))

const problemas = []

for (const ns of namespaces) {
  const esperadas = hojas(leer(REFERENCIA, ns))

  for (const idioma of otros) {
    if (!fs.existsSync(path.join(base, idioma, ns))) {
      problemas.push(`${idioma}/${ns} — el archivo no existe (${REFERENCIA} tiene ${esperadas.length} claves)`)
      continue
    }

    const presentes = hojas(leer(idioma, ns))
    const faltan = esperadas.filter((k) => !presentes.includes(k))
    const sobran = presentes.filter((k) => !esperadas.includes(k))

    // Se muestran hasta 10 por lado: la lista completa de un bloque faltante son cientos de lineas
    // y esconde el resto de los problemas.
    const muestra = (lista) => lista.slice(0, 10).map((k) => `      ${k}`).join('\n') +
      (lista.length > 10 ? `\n      … y ${lista.length - 10} mas` : '')

    if (faltan.length) {
      problemas.push(
        `${idioma}/${ns} — faltan ${faltan.length} clave(s) que SI estan en ${REFERENCIA}:\n${muestra(faltan)}`,
      )
    }
    if (sobran.length) {
      problemas.push(
        `${idioma}/${ns} — sobran ${sobran.length} clave(s) que NO estan en ${REFERENCIA}:\n${muestra(sobran)}`,
      )
    }
  }
}

if (problemas.length > 0) {
  console.error('\nERROR  i18n — los idiomas no estan parejos:\n')
  for (const p of problemas) console.error(`  ${p}\n`)
  console.error(
    '  Una clave que falta se le muestra CRUDA al usuario. Agregala en el idioma que falta,\n' +
      `  o borrala de ${REFERENCIA} si ya no se usa.\n`,
  )
  process.exit(1)
}

const resumen = namespaces
  .map((ns) => `${ns.replace('.json', '')} ${hojas(leer(REFERENCIA, ns)).length}`)
  .join(' . ')
console.log(`OK  i18n - ${idiomas.join(' = ')} parejos (${resumen})`)
