import { Car } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { MANIFIESTOS, ordenarManifiestos, verificarQueNoSeSolapan } from './index'
import { NAV_CONFIG } from '@/features/shell/nav-config'
import type { ManifiestoDeModulo } from '@/shared/types/modulo'

/**
 * La red del AGREGADOR, que es lo nuevo de F-03.
 *
 * ⚠️ **Por qué se testea con manifiestos fabricados y no con los instalados.** Los dos riesgos que
 * este slice INTRODUJO —el orden y el choque de rutas— necesitan **dos** módulos para existir, y hoy
 * hay uno solo instalado. Un test sobre `MANIFIESTOS` pasaría con cualquier implementación, incluso
 * con una que no ordene ni verifique nada: sería cobertura de mentira. Por eso las dos funciones se
 * exportan puras y se ejercitan con datos armados acá.
 */

function fabricar(key: string, orden: number, rutas: string[] = []): ManifiestoDeModulo {
  return {
    key,
    basePath: key,
    routes: () => null,
    navegacion: {
      key,
      labelKey: `${key}:nav.modulo`,
      icono: Car,
      hub: rutas[0] ?? `/app/${key}`,
      grupos: [
        {
          items: rutas.map((ruta, i) => ({
            key: `${key}.${i}`,
            labelKey: `${key}:nav.i${i}`,
            icono: Car,
            ruta,
          })),
        },
      ],
    },
    i18n: { namespace: key, recursos: {} },
    orden,
  }
}

describe('orden determinista de los módulos', () => {
  it('ordena por `orden`, no por el orden de importación', () => {
    const lista = [fabricar('zeta', 10), fabricar('alfa', 30), fabricar('beta', 20)]
    expect(ordenarManifiestos(lista).map((m) => m.key)).toEqual(['zeta', 'beta', 'alfa'])
  })

  it('a igualdad de `orden`, desempata por `key`: dos módulos nunca se intercambian solos', () => {
    const lista = [fabricar('zeta', 10), fabricar('alfa', 10)]
    expect(ordenarManifiestos(lista).map((m) => m.key)).toEqual(['alfa', 'zeta'])
    // El mismo resultado con la entrada al revés: es lo que "determinista" quiere decir.
    expect(ordenarManifiestos([...lista].reverse()).map((m) => m.key)).toEqual(['alfa', 'zeta'])
  })

  it('no muta la lista que recibe (`INSTALADOS` no se reordena solo)', () => {
    const lista = [fabricar('zeta', 30), fabricar('alfa', 10)]
    ordenarManifiestos(lista)
    expect(lista.map((m) => m.key)).toEqual(['zeta', 'alfa'])
  })
})

describe('choque de rutas entre módulos', () => {
  it('dos módulos con el mismo `basePath` explotan al arrancar, nombrando a los dos', () => {
    const chocan = [fabricar('uno', 10), { ...fabricar('dos', 20), basePath: 'uno' }]
    expect(() => verificarQueNoSeSolapan(chocan)).toThrow(/"uno".*"dos"/s)
  })

  it('dos módulos que declaran la misma ruta de nav explotan', () => {
    const chocan = [fabricar('uno', 10, ['/app/compartida']), fabricar('dos', 20, ['/app/compartida'])]
    expect(() => verificarQueNoSeSolapan(chocan)).toThrow(/\/app\/compartida/)
  })

  it('un módulo que repite su PROPIA ruta no es un choque', () => {
    expect(() => verificarQueNoSeSolapan([fabricar('uno', 10, ['/app/x', '/app/x'])])).not.toThrow()
  })

  it('módulos disjuntos no explotan', () => {
    const sanos = [fabricar('uno', 10, ['/app/uno/a']), fabricar('dos', 20, ['/app/dos/a'])]
    expect(() => verificarQueNoSeSolapan(sanos)).not.toThrow()
  })

  it('los módulos realmente instalados no chocan', () => {
    expect(() => verificarQueNoSeSolapan(MANIFIESTOS)).not.toThrow()
  })
})

describe('el sidebar sale del agregador', () => {
  it('todo módulo instalado tiene su link en NAV_CONFIG', () => {
    const links = NAV_CONFIG.filter((i) => i.type === 'link').map((i) => i.key)
    for (const m of MANIFIESTOS) expect(links).toContain(m.key)
  })

  it('NAV_CONFIG no tiene huecos: un módulo que no carga se omite, no deja `null`', () => {
    expect(NAV_CONFIG.every((i) => i !== null && i !== undefined)).toBe(true)
  })

  it('los links de módulo respetan el orden del agregador', () => {
    const links = NAV_CONFIG.filter((i) => i.type === 'link').map((i) => i.key)
    const instalados = MANIFIESTOS.map((m) => m.key)
    expect(instalados.map((k) => links.indexOf(k))).toEqual(
      [...instalados.map((k) => links.indexOf(k))].sort((a, b) => a - b),
    )
  })
})
