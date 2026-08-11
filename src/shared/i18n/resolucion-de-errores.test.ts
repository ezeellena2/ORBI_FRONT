import { describe, expect, it } from 'vitest'
import i18next from 'i18next'
import comun from './locales/es-AR/common.json'
import flota from './locales/es-AR/flota.json'

/**
 * REGRESION. Este archivo existe por un bug que pasó tres verificaciones sin que nadie lo viera,
 * porque typecheck, lint, build y los tests estaban todos en verde mientras la UI mostraba texto
 * crudo.
 *
 * El bug: `useTranslation(['flota', 'common'])` NO devuelve una `t` que busque en los dos
 * namespaces. react-i18next fija la función al PRIMERO y punto —
 * `getFixedT(lng, nsMode === 'fallback' ? namespaces : namespaces[0])` — y `nsMode` no se declara.
 * Como TODO el catálogo de errores (`errors.flota.*`, `errors.HTTP_*`, `errors.network`,
 * `errors.unexpected`) vive solo en `common.json`, `resolveApiErrorMessage` fallaba sus 3 primeros
 * intentos y caía a `detail` — que el contrato define como fallback textual y NO como copy de UX
 * (`errores.md` §Contrato de error). Sin `detail`, el usuario veía la cadena literal
 * `errors.unexpected`; con la red caída, "Network Error" en inglés crudo.
 *
 * El arreglo es `fallbackNS: 'common'` en la config. Estos tests lo anclan por COMPORTAMIENTO: se
 * construye una instancia con la misma configuración de namespaces que `index.ts` y se verifica que
 * una `t` fijada a `flota` resuelva las dos familias de claves.
 *
 * Ojo con "arreglarlo" cambiando el namespace de los call sites: los `validation.*` viven en los DOS
 * archivos con contenidos distintos y `resolveApiFieldErrors` depende de la versión de `flota`. El
 * último test cubre justamente eso.
 */

async function tDeUnModulo() {
  const instancia = i18next.createInstance()
  await instancia.init({
    resources: { 'es-AR': { common: comun, flota } },
    lng: 'es-AR',
    fallbackLng: 'es-AR',
    defaultNS: 'common',
    ns: ['common', 'flota'],
    // La línea que se está probando. Si alguien la borra, este archivo se pone rojo.
    fallbackNS: 'common',
    interpolation: { escapeValue: false },
  })

  // Exactamente lo que `useTranslation(['flota', 'common'])` entrega a un componente del módulo.
  return instancia.getFixedT('es-AR', 'flota')
}

describe('resolución de claves desde un namespace de módulo', () => {
  it('resuelve los errors.flota.* del catálogo, que viven en common.json', async () => {
    const t = await tDeUnModulo()
    const clave = 'errors.flota.dispositivo.canonico_no_coordinable'

    // La aserción real: devuelve COPY, no la clave de vuelta.
    expect(t(clave)).not.toBe(clave)
    expect(t(clave).length).toBeGreaterThan(0)
  })

  it('resuelve los genéricos por status y el de red', async () => {
    const t = await tDeUnModulo()

    for (const clave of ['errors.HTTP_403', 'errors.HTTP_409', 'errors.HTTP_500', 'errors.network', 'errors.unexpected']) {
      expect(t(clave), `${clave} salió sin traducir`).not.toBe(clave)
    }
  })

  it('las claves propias de flota siguen ganándole a common', async () => {
    const t = await tDeUnModulo()

    // `validation.*` existe en los dos namespaces con textos distintos. El fallback solo debe
    // dispararse cuando el namespace primario NO tiene la clave: si se invirtiera la precedencia,
    // los errores de campo del módulo se resolverían con el copy genérico.
    expect(t('validation.imei.length_invalid')).toBe(flota.validation.imei.length_invalid)
    expect(t('dispositivosListado.titulo')).toBe(flota.dispositivosListado.titulo)
  })

  it('sin fallbackNS el catálogo de errores queda muerto (es el bug que se arregló)', async () => {
    const instancia = i18next.createInstance()
    await instancia.init({
      resources: { 'es-AR': { common: comun, flota } },
      lng: 'es-AR',
      fallbackLng: 'es-AR',
      defaultNS: 'common',
      ns: ['common', 'flota'],
      interpolation: { escapeValue: false },
    })
    const t = instancia.getFixedT('es-AR', 'flota')

    // Se ancla el comportamiento ROTO a propósito: si una versión futura de i18next empezara a
    // hacer fallback sola, este test se pone rojo y avisa que la config ya no hace falta — en vez
    // de dejar una defensa silenciosa que nadie sabe si sigue sirviendo.
    expect(t('errors.unexpected')).toBe('errors.unexpected')
  })
})
