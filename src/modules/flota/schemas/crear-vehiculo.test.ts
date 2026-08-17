import { describe, expect, it } from 'vitest'
import {
  aCrearVehiculoRequest,
  valoresInicialesCrearVehiculo,
  type CrearVehiculoFormulario,
} from './crear-vehiculo'

/**
 * El ANCLA INTERMEDIA (`modeloId`) en el armado del request del alta.
 *
 * Lo que estos tests defienden, y que no se lee del código: el id del catálogo y el TEXTO viajan
 * JUNTOS, y su ausencia es un estado válido. El catálogo canónico todavía no cubre todos los
 * modelos (DA-CAT-02), así que un alta sin `modeloId` es el caso NORMAL, no un error — y un
 * `modeloId: ''` viajando como string vacío rompería la FK del Canónico.
 */
describe('aCrearVehiculoRequest — el ancla intermedia', () => {
  const base: CrearVehiculoFormulario = {
    ...valoresInicialesCrearVehiculo,
    patente: 'ab123cd',
    marca: 'Ford',
    modelo: 'Focus',
    anio: '2020',
    tipo: 'auto',
  }

  it('manda el modeloId cuando el usuario eligió el modelo del catálogo', () => {
    // Mata la mutación: borrar `modeloId` del objeto que arma el request. Sin esto, el usuario
    // elige del buscador, el id se pierde en el front y el vehículo nace por texto libre igual.
    const request = aCrearVehiculoRequest({
      ...base,
      marcaId: '0e000000-0000-4000-8000-0000000000a1',
      modeloId: '0e000000-0000-4000-8000-0000000000b2',
    })

    expect(request.modeloId).toBe('0e000000-0000-4000-8000-0000000000b2')
  })

  it('OMITE el modeloId cuando el modelo se tipeó a mano, en vez de mandar string vacío', () => {
    // Mata la mutación: cambiar `textoOpcional(valores.modeloId)` por `valores.modeloId`. Un `''`
    // no es "sin modelo": llega al backend como valor y no matchea ninguna fila del catálogo.
    const request = aCrearVehiculoRequest({ ...base, marcaId: '', modeloId: '' })

    expect(request.modeloId).toBeUndefined()
  })

  it('manda SIEMPRE marca y modelo como texto, haya o no id', () => {
    // La convivencia es deliberada: el Canónico guarda el id para decidir y el texto para mostrar.
    // Si el texto dejara de viajar cuando hay id, el vehículo perdería su nombre legible el día que
    // el catálogo cambie.
    const conId = aCrearVehiculoRequest({
      ...base,
      marcaId: '0e000000-0000-4000-8000-0000000000a1',
      modeloId: '0e000000-0000-4000-8000-0000000000b2',
    })
    const sinId = aCrearVehiculoRequest({ ...base, marcaId: '', modeloId: '' })

    expect(conId.marca).toBe('Ford')
    expect(conId.modelo).toBe('Focus')
    expect(sinId.marca).toBe('Ford')
    expect(sinId.modelo).toBe('Focus')
  })

  it('NO manda marcaId: la marca ya está implicada por la cascada del modelo', () => {
    // Mandarla sería una segunda verdad del mismo dato, y el contrato del backend no la declara.
    const request = aCrearVehiculoRequest({
      ...base,
      marcaId: '0e000000-0000-4000-8000-0000000000a1',
      modeloId: '0e000000-0000-4000-8000-0000000000b2',
    })

    expect(request).not.toHaveProperty('marcaId')
  })
})
