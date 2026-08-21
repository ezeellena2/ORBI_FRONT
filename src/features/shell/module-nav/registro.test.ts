import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import comunEs from '@/shared/i18n/locales/es-AR/common.json'
import comunEn from '@/shared/i18n/locales/en/common.json'
import { MANIFIESTOS } from '@/app/registry'
import { REGISTRO_DE_MODULOS, esItemActivo, moduloDeLaRuta } from './registro'
import type { ItemDeModulo } from '@/shared/types/modulo'

/**
 * La red de la navegación. **Se escribió ANTES del refactor de F-03** (registro escrito a mano →
 * agregador de manifiestos) y tiene que pasar igual antes y después: si pasa en los dos lados, el
 * refactor no rompió la navegación. Ese es todo su punto.
 *
 * Hasta acá `src/app/` y `src/features/` tenían **cero tests** (medido), y la navegación es lo que
 * decide si una pantalla construida es alcanzable.
 *
 * ── POR QUÉ SE LEE EL FUENTE EN VEZ DE RENDERIZAR ─────────────────────────────────────────────
 * El proyecto `unit` corre con `environment: 'node'` a propósito y `@testing-library/react` no está
 * instalado. El invariante que importa —qué `<Route>` captura qué ruta— es **estructural**: vive en
 * el árbol declarado, no en el runtime. Se verifica leyendo el fuente, igual que `verificar-i18n.mjs`
 * verifica los JSON sin levantar la app.
 *
 * ── QUÉ MUTACIÓN MATA CADA TEST ───────────────────────────────────────────────────────────────
 * · "toda ruta del registro llega a una pantalla real": mata declarar un ítem de nav apuntando a una
 *   ruta que nadie monta. Hoy el catch-all `*` de `AppRouter` la mandaría a "Próximamente" y el ítem
 *   se vería perfecto en la columna — falla silenciosa, que es la cara.
 * · "ningún placeholder estático tapa una ruta del módulo" (**el test del slice**): mata volver a
 *   montar en `FlotaRoutes` una ruta que `AppRouter` ya sirve como segmento estático. `react-router`
 *   rankea el estático por encima del splat, así que la pantalla montada queda **inalcanzable, sin
 *   error ni warning**. Ya pasó con Dispositivos: las 2 páginas existían y no las montaba nadie.
 * · "esItemActivo no se activa por prefijo": mata sacarle la barra final a `rutasHijas` o cambiar la
 *   coincidencia exacta por un `startsWith` pelado — con eso `/vehiculos` se activaría con un futuro
 *   `/vehiculos-archivados`.
 * · "moduloDeLaRuta devuelve null fuera de un módulo": mata devolver el primer registro por descarte.
 *   De ese `null` depende que la columna de módulo **no se renderice** en Dashboard ni en Usuarios.
 * · "toda labelKey existe en los 2 idiomas": mata agregar un ítem sin su traducción. Sin esto el
 *   usuario ve la clave cruda (`shell.nav.flotaX`) en el menú, que es lo que ya pasó con el bloque
 *   `shell.*` entero faltando en `en`.
 * · "sin keys duplicadas": mata dos módulos declarando el mismo `key` — con el agregador, el segundo
 *   pisaría al primero según el orden de importación, que nadie controla.
 */

/** Vitest corre desde la raíz del proyecto: es el ancla estable para leer fuentes. */
function leer(rutaRelativa: string): string {
  return readFileSync(join(process.cwd(), rutaRelativa), 'utf8')
}

/**
 * Quita comentarios LÍNEA A LÍNEA, con una máquina de estados.
 *
 * ⚠️ No se puede hacer con `replace(/\/\*[\s\S]*?\*\//g, '')`: los docblocks de estos dos archivos
 * citan rutas como `` `path="flota/*"` ``, y ese `/*` abre un comentario falso que se come el código
 * real que viene después. Es el bug que tuvo la primera versión de este test — parseaba
 * `"flota}\r\n <Route path="` como si fuera una ruta.
 */
function sinComentarios(fuente: string): string {
  let dentroDeBloque = false
  return fuente
    .split('\n')
    .map((linea) => {
      const limpia = linea.trim()
      if (dentroDeBloque) {
        // El cierre solo cuenta al final de la línea: `*/` a mitad de una cita no cierra nada.
        if (limpia.endsWith('*/') || limpia.endsWith('*/}')) dentroDeBloque = false
        return ''
      }
      if (limpia.startsWith('/*') || limpia.startsWith('{/*')) {
        if (!limpia.endsWith('*/') && !limpia.endsWith('*/}')) dentroDeBloque = true
        return ''
      }
      if (limpia.startsWith('*') || limpia.startsWith('//')) return ''
      return linea
    })
    .join('\n')
}

/** Los `path` de los `<Route>` realmente declarados en un archivo. */
function rutasDeclaradas(rutaRelativa: string): string[] {
  const fuente = sinComentarios(leer(rutaRelativa))
  const rutas: string[] = []
  const re = /<Route\b[^>]*?\bpath="([^"]*)"/gs
  let m: RegExpExecArray | null
  while ((m = re.exec(fuente)) !== null) rutas.push(m[1])

  // Red de seguridad: una ruta real no tiene comillas, llaves, `<` ni espacios. Si algo así entra,
  // el parser se rompió y es mejor enterarse acá que dar un verde falso.
  const sospechosas = rutas.filter((r) => !/^[A-Za-z0-9_\-:/*.]*$/.test(r))
  if (sospechosas.length > 0) {
    throw new Error(`El parser de rutas devolvió basura en ${rutaRelativa}: ${JSON.stringify(sospechosas)}`)
  }
  return rutas
}

const RUTAS_APP_ROUTER = rutasDeclaradas('src/app/routing/AppRouter.tsx')

/** Los `<Route>` de `AppRouter` que cuelgan de `/app` y son segmentos ESTÁTICOS (sin splat). */
const ESTATICAS_DE_APP = RUTAS_APP_ROUTER.filter(
  (r) => !r.startsWith('/') && !r.includes('*') && r !== '',
)

/**
 * Lo que cada módulo monta adentro de su splat, descubierto **desde su manifiesto**.
 *
 * Antes del refactor esto salía de parsear `AppRouter`, que tenía un `path="flota/*"` literal. Ahora
 * `AppRouter` los genera con `.map()` sobre los manifiestos, así que el fuente ya no dice qué
 * prefijos existen: la fuente de verdad pasó a ser el manifiesto, y el test la sigue.
 *
 * El archivo de rutas se deduce del `import ... from './XRoutes'` del propio manifiesto, así que
 * esto sigue andando para cualquier módulo que se agregue, sin tocar el test.
 */
const MONTADAS_POR_MODULO = new Map<string, string[]>(
  MANIFIESTOS.map((m) => {
    const manifiesto = leer(`src/modules/${m.key}/modulo.manifest.ts`)
    const importRoutes = /from '\.\/([A-Za-z]+Routes)'/.exec(manifiesto)
    if (importRoutes === null) {
      throw new Error(`El manifiesto de "${m.key}" no importa un componente de rutas reconocible.`)
    }
    return [m.basePath, rutasDeclaradas(`src/modules/${m.key}/${importRoutes[1]}.tsx`)]
  }),
)

/** Los prefijos delegados con splat, según los manifiestos instalados. */
const SPLATS_DE_APP = [...MONTADAS_POR_MODULO.keys()]

function todosLosItems(): ItemDeModulo[] {
  return REGISTRO_DE_MODULOS.flatMap((m) => m.grupos.flatMap((g) => g.items))
}

/**
 * Los catálogos de un idioma: `common` es del shell, el resto lo traen los MANIFIESTOS.
 *
 * ⚠️ Se arman desde los manifiestos y no con una lista escrita a mano. La primera versión de este
 * helper hardcodeaba `{ common, flota }`, y al enchufar un módulo de prueba el test lo reprobó por
 * no encontrar sus claves — el test seguía conociendo los módulos por nombre, que es exactamente lo
 * que este slice viene a eliminar. Lo encontró la prueba del módulo de mentira.
 */
function catalogosDe(idioma: 'es-AR' | 'en'): Record<string, Record<string, unknown>> {
  const catalogos: Record<string, Record<string, unknown>> = {
    common: (idioma === 'es-AR' ? comunEs : comunEn) as Record<string, unknown>,
  }
  for (const m of MANIFIESTOS) {
    const bundle = m.i18n.recursos[idioma]
    if (bundle !== undefined) catalogos[m.i18n.namespace] = bundle
  }
  return catalogos
}

/** Resuelve `ns:a.b.c` o `a.b.c` contra los catálogos de un idioma. */
function existeClave(labelKey: string, idioma: 'es-AR' | 'en'): boolean {
  const [ns, resto] = labelKey.includes(':') ? labelKey.split(':') : ['common', labelKey]
  const catalogo = catalogosDe(idioma)[ns]
  if (catalogo === undefined) return false

  let actual: unknown = catalogo
  for (const parte of resto.split('.')) {
    if (typeof actual !== 'object' || actual === null) return false
    actual = (actual as Record<string, unknown>)[parte]
  }
  return typeof actual === 'string'
}

describe('el árbol de rutas declarado', () => {
  it('toda ruta del registro llega a una pantalla real, no al catch-all', () => {
    const sinDestino = todosLosItems()
      .map((item) => item.ruta)
      .filter((ruta) => {
        const relativa = ruta.replace(/^\/app\//, '')
        // (a) la sirve un segmento estático de AppRouter (placeholder incluido: está declarado)
        if (ESTATICAS_DE_APP.includes(relativa)) return false
        // (b) o cae en un splat de módulo Y el módulo la monta adentro
        const splat = SPLATS_DE_APP.find((p) => relativa.startsWith(p + '/'))
        if (splat === undefined) return true
        const interna = relativa.slice(splat.length + 1)
        return !(MONTADAS_POR_MODULO.get(splat) ?? []).includes(interna)
      })

    expect(sinDestino).toEqual([])
  })

  it('todo hub de un módulo es una ruta declarada por alguno de sus ítems', () => {
    for (const modulo of REGISTRO_DE_MODULOS) {
      const rutas = modulo.grupos.flatMap((g) => g.items.map((i) => i.ruta))
      expect(rutas, `el hub de "${modulo.key}" no es ninguno de sus ítems`).toContain(modulo.hub)
    }
  })

  it('ningún placeholder estático tapa una ruta que el módulo monta (la trampa del splat)', () => {
    // `react-router` rankea el segmento ESTÁTICO por encima del splat: si las dos existen, la
    // pantalla del módulo queda inalcanzable y NADA lo avisa.
    const tapadas = SPLATS_DE_APP.flatMap((prefijo) =>
      (MONTADAS_POR_MODULO.get(prefijo) ?? []).filter((interna) => interna !== '*' && interna !== '').
        map((interna) => `${prefijo}/${interna}`).
        filter((completa) => ESTATICAS_DE_APP.includes(completa)),
    )

    expect(tapadas).toEqual([])
  })
})

describe('esItemActivo', () => {
  const vehiculos: ItemDeModulo = {
    key: 'x.vehiculos',
    labelKey: 'x',
    icono: null as never,
    ruta: '/app/flota/vehiculos',
    rutasHijas: ['/app/flota/vehiculos/'],
  }

  it('coincidencia exacta', () => {
    expect(esItemActivo(vehiculos, '/app/flota/vehiculos')).toBe(true)
  })

  it('una ruta hija lo deja activo (la ficha de detalle resalta su listado)', () => {
    expect(esItemActivo(vehiculos, '/app/flota/vehiculos/abc-123')).toBe(true)
  })

  it('NO se activa con un hermano que comparte prefijo', () => {
    // El caso que el docblock advierte: sin la barra final en `rutasHijas`, un `startsWith` pelado
    // haría que `/vehiculos` capture `/vehiculos-archivados`.
    expect(esItemActivo(vehiculos, '/app/flota/vehiculos-archivados')).toBe(false)
  })

  it('sin rutasHijas solo matchea exacto', () => {
    const mapa: ItemDeModulo = { key: 'x.mapa', labelKey: 'x', icono: null as never, ruta: '/app/flota/mapa' }
    expect(esItemActivo(mapa, '/app/flota/mapa')).toBe(true)
    expect(esItemActivo(mapa, '/app/flota/mapa/algo')).toBe(false)
  })
})

describe('moduloDeLaRuta', () => {
  it('devuelve el módulo de una ruta suya', () => {
    expect(moduloDeLaRuta('/app/flota/vehiculos')?.key).toBe('flota')
  })

  it('devuelve null fuera de todo módulo: de eso depende que la columna NO se dibuje', () => {
    expect(moduloDeLaRuta('/app')).toBeNull()
    expect(moduloDeLaRuta('/app/usuarios')).toBeNull()
    expect(moduloDeLaRuta('/app/perfil')).toBeNull()
  })
})

describe('i18n del registro', () => {
  it('toda labelKey existe en los DOS idiomas', () => {
    const claves = REGISTRO_DE_MODULOS.flatMap((m) => [
      m.labelKey,
      ...(m.subtituloKey === undefined ? [] : [m.subtituloKey]),
      ...m.grupos.flatMap((g) => [
        ...(g.tituloKey === undefined ? [] : [g.tituloKey]),
        ...g.items.map((i) => i.labelKey),
      ]),
    ])

    const faltantes = claves.flatMap((clave) => [
      ...(existeClave(clave, 'es-AR') ? [] : [`es-AR: ${clave}`]),
      ...(existeClave(clave, 'en') ? [] : [`en: ${clave}`]),
    ])

    expect(faltantes).toEqual([])
  })
})

describe('integridad del registro', () => {
  it('no hay `key` de módulo duplicada', () => {
    const keys = REGISTRO_DE_MODULOS.map((m) => m.key)
    expect(keys).toEqual([...new Set(keys)])
  })

  it('no hay `key` de ítem duplicada entre módulos', () => {
    const keys = todosLosItems().map((i) => i.key)
    expect(keys).toEqual([...new Set(keys)])
  })

  /*
   * ⚠️ `rutasHijas` tiene DOS significados, y el nombre solo describe uno. Se descubrió acá, con un
   * test que se puso rojo contra el código actual:
   *
   *   rutasHijas: ['/app/flota/problemas/', '/app/flota/integraciones']
   *                └─ prefijo de HIJAS (con barra)  └─ ALIAS de una ruta HERMANA (exacta)
   *
   * El alias viene del mockup (`aliases` en `module-nav.js`) y es legítimo: estar en Integraciones
   * deja resaltado el Centro de Problemas, que es de donde se llega. Por eso NO se puede exigir la
   * barra final en todas. Lo que sí se puede exigir es que ninguna entrada sea ambigua.
   */

  it('ninguna `rutasHijas` repite la `ruta` propia del ítem', () => {
    // Es la mutación cara: con `rutasHijas: ['/app/flota/vehiculos']` (sin barra) la coincidencia
    // exacta se vuelve un `startsWith` pelado, y `/app/flota/vehiculos-archivados` activaría el ítem.
    // Verificado por mutación: sin este test, sacarle la barra a una entrada real no rompía nada.
    const redundantes = todosLosItems().flatMap((item) =>
      (item.rutasHijas ?? []).filter((hija) => hija === item.ruta).map((hija) => `${item.key}: ${hija}`),
    )

    expect(redundantes).toEqual([])
  })

  it('una `rutasHijas` SIN barra final no puede ser prefijo de otra ruta del registro', () => {
    // Las entradas sin barra son ALIAS y se comparan con `startsWith` igual que las demás: si además
    // fueran prefijo de otra ruta declarada, dos ítems se activarían a la vez.
    const rutasDelRegistro = todosLosItems().map((i) => i.ruta)
    const ambiguas = todosLosItems().flatMap((item) =>
      (item.rutasHijas ?? [])
        .filter((hija) => !hija.endsWith('/'))
        .filter((hija) => rutasDelRegistro.some((r) => r !== hija && r.startsWith(hija)))
        .map((hija) => `${item.key}: ${hija}`),
    )

    expect(ambiguas).toEqual([])
  })

  it('no hay dos ítems con la misma `ruta`', () => {
    // Con el agregador, dos módulos que declaren la misma ruta harían que `moduloDeLaRuta` devuelva
    // el primero POR ORDEN DE IMPORTACIÓN, que nadie controla.
    const rutas = todosLosItems().map((i) => i.ruta)
    expect(rutas).toEqual([...new Set(rutas)])
  })
})
