import { describe, expect, it } from 'vitest'
import {
  PARAM_TICKET,
  PARAM_VISTA,
  TICKET_COMPLETO_DISPONIBLE,
  VISTAS_DEL_CENTRO,
  VISTA_POR_DEFECTO,
  problemaDelDeepLink,
  ticketDeLaUrl,
  vistaDesdeLaUrl,
} from './vocabulario-vistas-del-centro'

describe('vista desde la URL', () => {
  it('las 3 vistas de lista se resuelven a si mismas', () => {
    expect(VISTAS_DEL_CENTRO).toEqual(['sala', 'timeline', 'kanban'])

    for (const vista of VISTAS_DEL_CENTRO) {
      expect(vistaDesdeLaUrl(vista)).toBe(vista)
    }
  })

  it('sin ?vista= manda la Sala', () => {
    expect(vistaDesdeLaUrl(null)).toBe(VISTA_POR_DEFECTO)
    expect(vistaDesdeLaUrl('')).toBe('sala')
  })

  it('un ?vista= desconocido cae en la Sala en vez de dejar la pantalla en blanco', () => {
    expect(vistaDesdeLaUrl('SALA')).toBe('sala')
    expect(vistaDesdeLaUrl('cualquier-cosa')).toBe('sala')
    // `ticket` NO es un valor de `?vista=`: es su propio param.
    expect(vistaDesdeLaUrl('ticket')).toBe('sala')
  })

  it('los nombres de los params son los del contrato, en query string y nunca hash', () => {
    expect(PARAM_VISTA).toBe('vista')
    expect(PARAM_TICKET).toBe('ticket')
  })
})

describe('deep link del ticket', () => {
  it('el vacio se trata como ausente', () => {
    expect(problemaDelDeepLink(null)).toBeNull()
    expect(problemaDelDeepLink('')).toBeNull()
    expect(problemaDelDeepLink('   ')).toBeNull()
  })

  it('un id llega recortado', () => {
    expect(problemaDelDeepLink(' abc ')).toBe('abc')
  })

  /**
   * `f-09` construyó la vista completa, así que `?ticket=` volvió a su significado contratado y
   * GANA sobre `?vista=` (ficha §8). La consecuencia declarada: la selección de la Sala dejó de
   * vivir en la URL y pasó a estado local, que es lo que la ficha describe (1.er click selecciona y
   * **no navega**).
   */
  it('el ticket completo esta construido y el param gana sobre la vista', () => {
    expect(TICKET_COMPLETO_DISPONIBLE).toBe(true)
    expect(ticketDeLaUrl('p-1')).toBe('p-1')
  })

  it('sin ?ticket= no hay ticket, aunque haya ?vista=', () => {
    expect(ticketDeLaUrl(null)).toBeNull()
    expect(ticketDeLaUrl('  ')).toBeNull()
  })
})
