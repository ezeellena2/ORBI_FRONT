import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('resuelve el conflicto a favor de la ÚLTIMA clase', () => {
    // Es la razón entera por la que `cn` usa tailwind-merge y no un `join(' ')`:
    // sin esto, `className` pasante deja las dos clases en el atributo y gana la
    // que el bundler haya puesto última en la hoja de estilos. O sea: el
    // override funciona o no según el orden del build.
    expect(cn('bg-superficie-1', 'bg-superficie-2')).toBe('bg-superficie-2')
  })

  it('no mezcla grupos distintos', () => {
    expect(cn('bg-superficie-1', 'text-fg-primario')).toBe('bg-superficie-1 text-fg-primario')
  })

  it('distingue el mismo grupo bajo modificadores distintos', () => {
    expect(cn('bg-accion', 'hover:bg-accion-hover')).toBe('bg-accion hover:bg-accion-hover')
  })

  it('ignora falsy y acepta condicionales', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
  })
})
