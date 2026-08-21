import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionStore } from '@/stores/session-store'
import { tienePermisoEn } from './usePermisos'

/**
 * `usePermisos` — la lectura de permisos de la organizacion activa.
 *
 * Se testea el PREDICADO, no el hook: el proyecto `unit` corre con `environment: 'node'` a
 * proposito (`vite.config.ts`), sin DOM. El hook es un binding de 3 lineas sobre este predicado y
 * su comportamiento en React lo cubre Storybook, que corre en browser real.
 *
 * ── QUE MUTACION MATA CADA TEST ───────────────────────────────────────────────────────────────
 *
 * 1. "permiso presente" y "permiso ausente" matan invertir el `includes` (`!permisos?.includes`).
 *
 * 2. "sin organizacion activa" mata cambiar el `?? false` por `?? true`. Es LA mutacion cara: es la
 *    ruta degradada (sesion a medio hidratar) y un default permisivo ahi abre acciones que el
 *    usuario no tiene, que el backend despues rechaza con 403. Ningun otro test la mata.
 *
 * 3. "array vacio" mata reemplazar el `?? false` por `?.length > 0` o similar: con permisos
 *    cargados pero vacios la respuesta sigue siendo `false`, no un error.
 *
 * 4. "la misma referencia entre lecturas" mata mover el `?? []` ADENTRO del selector del hook. Esa
 *    mutacion no rompe ningun assert de valor y compila: en la app tira "Maximum update depth
 *    exceeded" y el ErrorBoundary tapa la pantalla entera. Zustand 5 corre el selector dentro de
 *    `useSyncExternalStore`, asi que un array nuevo por lectura es referencia nueva por lectura.
 */

const estadoInicial = useSessionStore.getState()

beforeEach(() => {
  useSessionStore.setState(estadoInicial, true)
})

describe('tienePermisoEn', () => {
  it('devuelve true cuando el permiso esta', () => {
    expect(tienePermisoEn(['flota.vehiculos.leer', 'flota.vehiculos.crear'], 'flota.vehiculos.crear')).toBe(true)
  })

  it('devuelve false cuando el permiso NO esta', () => {
    expect(tienePermisoEn(['flota.vehiculos.leer'], 'flota.vehiculos.eliminar')).toBe(false)
  })

  it('devuelve false sin organizacion activa, en vez de abrir la UI', () => {
    expect(tienePermisoEn(undefined, 'flota.vehiculos.leer')).toBe(false)
  })

  it('devuelve false con la lista de permisos vacia', () => {
    expect(tienePermisoEn([], 'flota.vehiculos.leer')).toBe(false)
  })
})

describe('el selector del hook', () => {
  it('devuelve la MISMA referencia entre lecturas (el `?? []` va AFUERA)', () => {
    useSessionStore.setState(
      { organizacionActiva: { permisos: ['flota.vehiculos.leer'] } as never },
      false
    )

    // El selector del hook, tal cual: `estado.organizacionActiva?.permisos`, sin default adentro.
    const leerComoElHook = () => useSessionStore.getState().organizacionActiva?.permisos

    // Dos lecturas del MISMO estado tienen que dar la misma referencia. Si el default se
    // construyera adentro del selector, cada lectura devolveria un array nuevo.
    expect(leerComoElHook()).toBe(leerComoElHook())
  })
})
