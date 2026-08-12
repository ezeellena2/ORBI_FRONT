import { describe, expect, it } from 'vitest'
import type { LicenciaConductorDto } from '@/services/contracts/flota'
import {
  claveDeEstadoDocumento,
  estadoLicenciaVisible,
  varianteDeEstadoDocumento,
  varianteDeLicenciaVisible,
} from './vocabulario-licencia'

/**
 * REGRESION de "el front recalculo el umbral".
 *
 * `f-06` §6 es explicito: el estado del documento lo **calcula el backend** (umbral 30 dias) y el
 * front NO lo recalcula. Pero `ConductorListItemDto.licencia` **no trae** `estadoDerivado`: solo
 * `diasParaVencer`. La tentacion evidente —y el bug que estos tests bloquean— es escribir
 * `dias <= 30 ? 'por_vencer' : 'vigente'` en la celda, que duplica una regla de negocio en dos
 * lugares y la desincroniza el dia que el backend cambie el umbral.
 *
 * El vocabulario del LISTADO se degrada a lo que el contrato afirma literalmente, y `por_vencer`
 * **no puede salir de acá**. Se pinta solo en el DETALLE, donde el backend lo manda hecho.
 */

function licencia(parcial: Partial<LicenciaConductorDto> = {}): LicenciaConductorDto {
  return {
    categoria: null,
    numero: 'B-123',
    vencimiento: '2027-03-12',
    diasParaVencer: 340,
    fechaEmision: '2022-03-12',
    ...parcial,
  }
}

describe('estadoLicenciaVisible', () => {
  it('sin objeto licencia es `sin_cargar`: es una AUSENCIA, no una derivacion', () => {
    expect(estadoLicenciaVisible(null)).toBe('sin_cargar')
  })

  it('con licencia pero sin fecha es `sin_vencimiento`, no "vigente"', () => {
    // `dtos.ts` declara ese `null` como "no hay fecha cargada". Decir "vigente" seria afirmar algo
    // que nadie verifico.
    expect(estadoLicenciaVisible(licencia({ diasParaVencer: null, vencimiento: null }))).toBe(
      'sin_vencimiento',
    )
  })

  it('dias negativos es `vencida` — el contrato dice literal "negativo = vencida"', () => {
    expect(estadoLicenciaVisible(licencia({ diasParaVencer: -1 }))).toBe('vencida')
    expect(estadoLicenciaVisible(licencia({ diasParaVencer: -400 }))).toBe('vencida')
  })

  it('cero dias TODAVIA es vigente: vence hoy, no venció', () => {
    expect(estadoLicenciaVisible(licencia({ diasParaVencer: 0 }))).toBe('vigente')
  })

  it('NO devuelve `por_vencer` NUNCA, ni con 1 dia: ese corte lo decide el backend', () => {
    for (const dias of [1, 5, 15, 29, 30, 31, 90]) {
      expect(estadoLicenciaVisible(licencia({ diasParaVencer: dias }))).toBe('vigente')
    }
  })
})

describe('varianteDeLicenciaVisible', () => {
  it('solo la vencida se pinta de peligro; la ausencia de dato es neutra, no roja', () => {
    expect(varianteDeLicenciaVisible('vencida')).toBe('peligro')
    expect(varianteDeLicenciaVisible('vigente')).toBe('exito')
    expect(varianteDeLicenciaVisible('sin_cargar')).toBe('neutro')
    expect(varianteDeLicenciaVisible('sin_vencimiento')).toBe('neutro')
  })
})

describe('varianteDeEstadoDocumento', () => {
  it('mapea los 4 codigos del catalogo que deriva el backend', () => {
    expect(varianteDeEstadoDocumento('vigente')).toBe('exito')
    expect(varianteDeEstadoDocumento('por_vencer')).toBe('advertencia')
    expect(varianteDeEstadoDocumento('vencido')).toBe('peligro')
    expect(varianteDeEstadoDocumento('sin_cargar')).toBe('neutro')
  })

  it('la clave i18n ES el codigo snake_case, sin traducirlo a otro vocabulario', () => {
    expect(claveDeEstadoDocumento('por_vencer')).toBe('estadoDocumento.por_vencer')
  })
})
