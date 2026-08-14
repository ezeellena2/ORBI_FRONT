import { describe, expect, it } from 'vitest'
import type { SituacionVehiculo } from '@/services/contracts/flota'
import { claveDeSituacion, VALORES_SITUACION_VEHICULO } from './vocabulario-situacion'

/**
 * `situacion` es el unico filtro compuesto de esta pantalla que NO depende de Telemetria, y por eso
 * su vocabulario se ancla aparte del de conexion: si alguien los unifica "porque los dos son
 * estados", el filtro que sobrevive a la caida de Telemetria se vuelve tan fragil como el otro.
 */

describe('VALORES_SITUACION_VEHICULO', () => {
  it('ofrece los 4 valores del contrato, ni uno mas', () => {
    // `satisfies` verifica que cada elemento sea del tipo, NO que esten todos: sin este test, borrar
    // `sin_conductor` del array compila igual y el chip pierde una opcion en silencio.
    expect([...VALORES_SITUACION_VEHICULO]).toEqual([
      'con_dispositivo_gps',
      'sin_dispositivo_gps',
      'con_conductor',
      'sin_conductor',
    ])
  })

  it('NO mezcla el vocabulario de conexion: son ejes distintos', () => {
    // Un valor de `EstadoConexion` acá haría que el backend devuelva lista vacía (un valor fuera del
    // vocabulario no ensancha el filtro: lo apaga).
    const comoTexto: readonly string[] = VALORES_SITUACION_VEHICULO

    expect(comoTexto).not.toContain('en_linea')
    expect(comoTexto).not.toContain('sin_dato')
  })
})

describe('claveDeSituacion', () => {
  it('mapea cada codigo a su clave i18n, sin traducir el codigo', () => {
    const todos: SituacionVehiculo[] = [...VALORES_SITUACION_VEHICULO]

    expect(todos.map(claveDeSituacion)).toEqual([
      'situacionVehiculo.con_dispositivo_gps',
      'situacionVehiculo.sin_dispositivo_gps',
      'situacionVehiculo.con_conductor',
      'situacionVehiculo.sin_conductor',
    ])
  })
})
