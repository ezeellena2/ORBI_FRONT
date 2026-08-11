import { describe, expect, it } from 'vitest'
import { camposDispositivoQueNoSePuedenBorrar } from './editar-dispositivo'
import { camposQueNoSePuedenBorrar } from './editar-vehiculo'

/**
 * REGRESION del "guardé y no se guardó, y nadie me avisó".
 *
 * Ningún `PATCH` de Flota puede BORRAR un campo: `System.Text.Json` no distingue "ausente" de
 * "null", así que el service preserva (`request.X ?? entidad.X`), y del lado del cliente
 * `JSON.stringify` ni siquiera manda las propiedades `undefined`. El usuario vaciaba las notas,
 * guardaba, el modal cerraba en verde y las notas seguían ahí.
 *
 * `camposQueNoSePuedenBorrar` existía para avisarlo — exportado, documentado con esa misma
 * explicación y con CERO consumidores. Estos tests anclan la regla y, sobre todo, que el aviso
 * distinga "lo vació" de "no lo tocó": avisar de más entrena al usuario a ignorar el cartel.
 */

describe('camposDispositivoQueNoSePuedenBorrar', () => {
  const actual = {
    alias: 'GPS Norte',
    modeloId: 'uuid-modelo',
    numeroSim: '1155667788',
    proveedorSimId: 'uuid-proveedor',
    notasOperativas: 'Instalado bajo el tablero',
  }

  const sinCambios = {
    alias: 'GPS Norte',
    modeloId: 'uuid-modelo',
    numeroSim: '1155667788',
    proveedorSimId: 'uuid-proveedor',
    notasOperativas: 'Instalado bajo el tablero',
  }

  it('no avisa nada cuando no se vació ningún campo', () => {
    expect(camposDispositivoQueNoSePuedenBorrar(sinCambios, actual)).toEqual([])
  })

  it('avisa por cada campo que tenía valor y quedó vacío', () => {
    const vaciados = { ...sinCambios, alias: '', notasOperativas: '   ' }

    // El espacio en blanco cuenta como vacío: se trimea antes de mandar, así que viaja `undefined`.
    expect(camposDispositivoQueNoSePuedenBorrar(vaciados, actual)).toEqual([
      'alias',
      'notasOperativas',
    ])
  })

  it('los DOS selects de catálogo entran igual que los textos: vaciarlos tampoco desvincula', () => {
    // Contra la creencia anterior de que `proveedorSimId` admitía `null` y sí desvinculaba. El
    // service resuelve los dos con el mismo `??`: el pendiente del PO es UNO, no dos asimétricos.
    const vaciados = { ...sinCambios, modeloId: '', proveedorSimId: '' }

    expect(camposDispositivoQueNoSePuedenBorrar(vaciados, actual)).toEqual([
      'modeloId',
      'proveedorSimId',
    ])
  })

  it('un campo que YA estaba vacío no genera aviso: no se perdió ningún cambio', () => {
    const previoVacio = { ...actual, notasOperativas: null }
    const vaciados = { ...sinCambios, notasOperativas: '' }

    expect(camposDispositivoQueNoSePuedenBorrar(vaciados, previoVacio)).toEqual([])
  })

  it('un campo todavía no registrado por el form no es "vaciado", es "no lo tocaron"', () => {
    // `useWatch` devuelve valores PARCIALES: `undefined` significa que el control aún no reportó.
    expect(camposDispositivoQueNoSePuedenBorrar({}, actual)).toEqual([])
  })
})

describe('camposQueNoSePuedenBorrar (vehículo)', () => {
  const actual = { alias: 'Camioneta 1', kilometrajeActual: 84000, notasOperativas: 'Service al día' }

  it('detecta los 3 campos del PATCH de vehículo', () => {
    const vaciados = { alias: '', kilometrajeActual: '', notasOperativas: '' }

    expect(camposQueNoSePuedenBorrar(vaciados, actual)).toEqual([
      'alias',
      'kilometrajeActual',
      'notasOperativas',
    ])
  })

  it('un kilometraje en 0 previo NO es "tenía valor vacío": 0 es un dato', () => {
    const vaciados = { alias: 'Camioneta 1', kilometrajeActual: '', notasOperativas: 'Service al día' }

    expect(camposQueNoSePuedenBorrar(vaciados, { ...actual, kilometrajeActual: 0 })).toEqual([
      'kilometrajeActual',
    ])
  })
})
