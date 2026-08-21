import { describe, expect, it, vi } from 'vitest'
import { limitesDe, manejadoresDelMarcador, posicionEstable, type EntidadUbicada } from './geometria'

/**
 * La maquinaria genérica del mapa. Vivía en `modules/flota/vocabulario-mapa.test.ts` y viajó con su
 * código en el slice **F-02**: no sabe qué es un vehículo, así que su test tampoco.
 *
 * ── QUÉ MUTACIÓN MATA CADA TEST ───────────────────────────────────────────────────────────────
 *
 * · "la misma posición devuelve la MISMA tupla": mata devolver `[lat, lng]` nuevo en cada llamada
 *   —o sea, borrar la caché—. Es la mutación cara y **no rompe ningún assert de valor**: la app
 *   sigue dibujando bien, pero `react-leaflet` compara `position` por IDENTIDAD y reescribe los N
 *   marcadores en cada render. Sin este test la regresión es invisible hasta que alguien mide.
 * · "cuando la entidad SE MUEVE devuelve una tupla nueva": mata cachear por id ignorando las
 *   coordenadas — el marcador se congelaría en su primera posición.
 * · "cada entidad tiene su propia entrada": mata usar una sola variable en vez de un `Map`.
 * · "si el callback cambia, los handlers se rehacen": mata cachear solo por id. Es lo que impide
 *   que la caché se convierta en un bug: con un `onSeleccionar` inline quedarían handlers apuntando
 *   al render viejo.
 * · "el rectángulo contiene a todos": mata invertir cualquiera de los 4 comparadores de `limitesDe`.
 * · "sin marcadores no hay rectángulo": mata devolver un rectángulo degenerado en vez de `null` —
 *   con eso el encuadre inicial mandaría la cámara al golfo de Guinea.
 */

function entidad(id: string, lat: number, lng: number): EntidadUbicada {
  return { id, lat, lng }
}

describe('estabilidad por valor de las props del marcador', () => {
  it('la misma posicion devuelve la MISMA tupla (react-leaflet compara por identidad)', () => {
    // Con un array literal en el JSX, cada render disparaba `setLatLng` + `marker.update()` en los N
    // marcadores. Un buscador re-renderiza en cada tecla: 8 caracteres sobre 200 entidades eran
    // 1.600 reescrituras del DOM sin que se hubiera movido nada.
    const a = posicionEstable('v1', -34.6, -58.44)
    const b = posicionEstable('v1', -34.6, -58.44)
    expect(b).toBe(a)
    expect(a).toEqual([-34.6, -58.44])
  })

  it('cuando la entidad SE MUEVE devuelve una tupla nueva', () => {
    const a = posicionEstable('v2', -34.6, -58.44)
    const b = posicionEstable('v2', -34.61, -58.44)
    expect(b).not.toBe(a)
    expect(b).toEqual([-34.61, -58.44])
  })

  it('cada entidad tiene su propia entrada: no se pisan entre si', () => {
    const a = posicionEstable('v3', -30, -60)
    const b = posicionEstable('v4', -31, -61)
    expect(a).not.toBe(b)
    expect(posicionEstable('v3', -30, -60)).toBe(a)
  })

  it('los handlers son estables mientras no cambie el callback, y llaman con el id correcto', () => {
    const onSeleccionar = vi.fn()
    const a = manejadoresDelMarcador('v5', onSeleccionar)
    expect(manejadoresDelMarcador('v5', onSeleccionar)).toBe(a)

    a.click()
    expect(onSeleccionar).toHaveBeenCalledWith('v5')
  })

  it('si el callback cambia, los handlers se rehacen: no queda apuntando al render viejo', () => {
    // Es la parte que impide que la cache se convierta en un bug: hoy `onSeleccionar` suele ser la
    // accion del store (identidad estable), pero un arrow inline dejaria handlers muertos.
    const viejo = vi.fn()
    const nuevo = vi.fn()
    const a = manejadoresDelMarcador('v6', viejo)
    const b = manejadoresDelMarcador('v6', nuevo)

    expect(b).not.toBe(a)
    b.click()
    expect(nuevo).toHaveBeenCalledWith('v6')
    expect(viejo).not.toHaveBeenCalled()
  })
})

describe('encuadre', () => {
  it('sin marcadores no hay rectangulo que encuadrar', () => {
    expect(limitesDe([])).toBeNull()
  })

  it('el rectangulo contiene a todas las entidades', () => {
    const limites = limitesDe([entidad('a', -34.6, -58.4), entidad('b', -31.4, -64.2)])

    expect(limites).toEqual([
      [-34.6, -64.2],
      [-31.4, -58.4],
    ])
  })

  it('una sola entidad da un rectangulo de area cero, no null', () => {
    // Quien encuadra tiene que toparse con esto y aplicar su `maxZoom`: sin tope, Leaflet se va al
    // zoom maximo y el usuario aterriza mirando una vereda.
    expect(limitesDe([entidad('u', -34.6, -58.44)])).toEqual([
      [-34.6, -58.44],
      [-34.6, -58.44],
    ])
  })
})
