import { describe, expect, it } from 'vitest'
import {
  aCrearConductorRequest,
  crearConductorSchema,
  VALORES_INICIALES_CREAR_CONDUCTOR,
  type CrearConductorFormulario,
} from './crear-conductor'

/**
 * El alta de conductor, que es lo unico del slice donde el front puede mandar un request
 * ESTRUCTURALMENTE invalido.
 *
 * El backend exige **exactamente uno** de `personaId` (Modo A) o `persona` (Modo B) —
 * `validation.persona.modo_invalido`, declarado sobre el request entero y no sobre un campo—, asi
 * que un formulario que mande los dos, o ninguno, recibe un 400 por una combinacion que el usuario
 * no ve en ningun campo. Estos tests anclan que el mapeo respete el modo elegido.
 *
 * Tambien anclan que los opcionales vacios se OMITAN: `JSON.stringify` descarta las propiedades
 * `undefined`, pero un `''` SI viaja — y `personaId: ''` es un uuid invalido, o sea un 400 de forma
 * por no haber completado algo que en ese modo ni siquiera aplica.
 */

function formulario(parcial: Partial<CrearConductorFormulario> = {}): CrearConductorFormulario {
  return { ...VALORES_INICIALES_CREAR_CONDUCTOR, ...parcial }
}

describe('aCrearConductorRequest — Modo B (por documento, el camino real)', () => {
  it('manda `persona` y NUNCA `personaId`', () => {
    const request = aCrearConductorRequest(
      formulario({
        modo: 'nuevo',
        tipoDocumento: 'dni',
        numeroDocumento: '30111222',
        nombre: 'Ana',
        apellido: 'Gomez',
        // El del otro modo queda cargado en el form; no tiene que viajar.
        personaId: '11111111-1111-1111-1111-111111111111',
      }),
    )

    expect(request.persona).toEqual({
      tipoDocumento: 'dni',
      numeroDocumento: '30111222',
      nombre: 'Ana',
      apellido: 'Gomez',
      telefono: undefined,
    })
    expect(request.personaId).toBeUndefined()
  })

  it('el telefono vacio se omite, no viaja como string vacio', () => {
    const request = aCrearConductorRequest(
      formulario({ modo: 'nuevo', numeroDocumento: '30111222', nombre: 'A', apellido: 'B' }),
    )

    expect(request.persona?.telefono).toBeUndefined()
  })

  it('NO manda email ni fechaNacimiento: el Canonico los descarta y el form no los pide', () => {
    const request = aCrearConductorRequest(
      formulario({ modo: 'nuevo', numeroDocumento: '1', nombre: 'A', apellido: 'B' }),
    )

    expect(request.persona).not.toHaveProperty('email')
    expect(request.persona).not.toHaveProperty('fechaNacimiento')
  })
})

describe('aCrearConductorRequest — Modo A (persona ya proyectada)', () => {
  it('manda `personaId` y NUNCA `persona`', () => {
    const request = aCrearConductorRequest(
      formulario({
        modo: 'existente',
        personaId: '11111111-1111-1111-1111-111111111111',
        // Los del otro modo quedan cargados en el form; no tienen que viajar.
        numeroDocumento: '30111222',
        nombre: 'Ana',
      }),
    )

    expect(request.personaId).toBe('11111111-1111-1111-1111-111111111111')
    expect(request.persona).toBeUndefined()
  })
})

describe('aCrearConductorRequest — operativos', () => {
  it('legajo y notas vacios se omiten', () => {
    const request = aCrearConductorRequest(
      formulario({ modo: 'nuevo', numeroDocumento: '1', nombre: 'A', apellido: 'B' }),
    )

    expect(request.numeroLegajo).toBeUndefined()
    expect(request.notas).toBeUndefined()
  })

  it('NO manda `licencia` ni `enviarInvitacion`: los dos se rechazan con 400', () => {
    const request = aCrearConductorRequest(
      formulario({ modo: 'nuevo', numeroDocumento: '1', nombre: 'A', apellido: 'B' }),
    )

    expect(request).not.toHaveProperty('licencia')
    expect(request).not.toHaveProperty('enviarInvitacion')
  })
})

describe('crearConductorSchema', () => {
  it('Modo A exige el identificador de la persona', () => {
    const resultado = crearConductorSchema.safeParse(formulario({ modo: 'existente' }))

    expect(resultado.success).toBe(false)
    expect(mensajes(resultado)).toContain('validation.persona_id.required')
  })

  it('Modo A NO exige los campos del Modo B', () => {
    const resultado = crearConductorSchema.safeParse(
      formulario({ modo: 'existente', personaId: 'uuid', tipoDocumento: '', nombre: '' }),
    )

    expect(resultado.success).toBe(true)
  })

  it('Modo B exige documento, nombre y apellido con LOS MISMOS codes del backend', () => {
    const resultado = crearConductorSchema.safeParse(
      formulario({ modo: 'nuevo', tipoDocumento: '', numeroDocumento: '', nombre: '', apellido: '' }),
    )

    expect(resultado.success).toBe(false)
    expect(mensajes(resultado)).toEqual(
      expect.arrayContaining([
        'validation.tipo_documento.required',
        'validation.numero_documento.required',
        'validation.nombre.required',
        'validation.apellido.required',
      ]),
    )
  })

  it('el documento se acota COMPUESTO (tipo + numero <= 50), igual que el validator', () => {
    // La columna `documento_resumen varchar(50)` guarda `"{tipo} {numero}"`: repartir los 50 entre
    // los dos campos seria un numero inventado, y pasarse revienta el INSERT con un 500 mudo.
    const resultado = crearConductorSchema.safeParse(
      formulario({ modo: 'nuevo', tipoDocumento: 'dni', numeroDocumento: '3'.repeat(48), nombre: 'A', apellido: 'B' }),
    )

    expect(resultado.success).toBe(false)
    expect(mensajes(resultado)).toContain('validation.documento.max_length')
  })

  it('NO le pone maximo a las notas: el validator del backend tampoco', () => {
    const resultado = crearConductorSchema.safeParse(
      formulario({
        modo: 'nuevo',
        numeroDocumento: '1',
        nombre: 'A',
        apellido: 'B',
        notas: 'x'.repeat(5000),
      }),
    )

    expect(resultado.success).toBe(true)
  })
})

function mensajes(resultado: ReturnType<typeof crearConductorSchema.safeParse>): string[] {
  return resultado.success ? [] : resultado.error.issues.map((issue) => issue.message)
}
