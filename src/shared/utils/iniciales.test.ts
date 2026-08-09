import { describe, expect, it } from 'vitest'
import { inicialesDe } from './iniciales'

describe('inicialesDe', () => {
  it('toma la primera del primer nombre y la primera del último', () => {
    expect(inicialesDe('Ezequiel Ellena')).toBe('EE')
    expect(inicialesDe('María Soledad Pérez Gómez')).toBe('MG')
  })

  it('con un solo nombre devuelve sus dos primeras letras', () => {
    expect(inicialesDe('Cher')).toBe('CH')
  })

  it('tolera espacios de más sin producir iniciales vacías', () => {
    expect(inicialesDe('  Ana   Ruiz  ')).toBe('AR')
  })

  it('con nombre vacío devuelve un marcador, nunca un string vacío', () => {
    // Un avatar en blanco parece un error de carga; el marcador dice
    // "no tenemos el nombre", que es lo que efectivamente pasa.
    expect(inicialesDe('')).toBe('?')
    expect(inicialesDe('   ')).toBe('?')
  })
})
