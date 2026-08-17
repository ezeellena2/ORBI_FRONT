import { describe, expect, it } from 'vitest'
import { repartirErroresDelAlta } from './errores-alta-conductor'

/**
 * REGRESION de "el 400 del Modo B no se ve en ninguna parte".
 *
 * `CrearConductorRequest` es el primer request ANIDADO del modulo y el formulario del modal es
 * plano. Las reglas del Modo B se declaran sobre `x.Persona!.Nombre` &co, asi que
 * `ValidationActionFilter` agrupa por `Persona.Nombre` y `normalizeFieldName` lo camelliza entero a
 * `personaNombre`. El codigo anterior hacia `form.setError(campo as keyof Formulario, …)`: el cast
 * tapaba el desajuste, el mensaje se escribia en un campo inexistente y el banner quedaba apagado
 * porque `hasApiFieldErrors` daba `true`. El usuario apretaba "Crear conductor" y no pasaba NADA.
 *
 * `validation.persona.modo_invalido` se declara con `RuleFor(x => x)` ⇒ `PropertyName` VACIO: no
 * tiene campo posible y **tiene** que ganar el banner.
 */

/**
 * Traduccion marcadora. NO puede ser la identidad: `translateKey` considera "sin traduccion" a todo
 * `t(k) === k`, asi que una identidad haria caer TODOS los mensajes al ultimo fallback. Acá interesa
 * el REPARTO, no el copy — el prefijo alcanza para leer de que clave salio cada mensaje.
 */
const traducir = (clave: string) => `t:${clave}`

/**
 * Respuesta de error como la ve `parseApiError`, SIN importar axios: `axios.isAxiosError` solo
 * chequea `isAxiosError === true` sobre el objeto. Importar axios acá lo rechaza la regla F10 del
 * repo (el HTTP vive centralizado en `services/`), y el test no necesita la clase real.
 */
function respuestaDeError(status: number, data: Record<string, unknown>): unknown {
  return { isAxiosError: true, response: { status, data } }
}

function error400(validationErrors: Record<string, Array<{ code: string }>>): unknown {
  return respuestaDeError(400, {
    status: 400,
    title: 'Errores de validacion',
    code: 'validation.failed',
    message_key: 'errors.validation.failed',
    validation_errors: Object.fromEntries(
      Object.entries(validationErrors).map(([campo, errores]) => [
        campo,
        errores.map((item) => ({ ...item, message_key: item.code, message: item.code, args: {} })),
      ]),
    ),
  })
}

describe('repartirErroresDelAlta', () => {
  it('manda los 5 campos anidados del Modo B a los campos PLANOS del formulario', () => {
    const resultado = repartirErroresDelAlta(
      error400({
        'Persona.TipoDocumento': [{ code: 'validation.tipo_documento.required' }],
        'Persona.NumeroDocumento': [{ code: 'validation.numero_documento.required' }],
        'Persona.Nombre': [{ code: 'validation.nombre.required' }],
        'Persona.Apellido': [{ code: 'validation.apellido.required' }],
        'Persona.Telefono': [{ code: 'validation.telefono.max_length' }],
      }),
      traducir,
    )

    expect(resultado.campos.map(([campo]) => campo)).toEqual([
      'tipoDocumento',
      'numeroDocumento',
      'nombre',
      'apellido',
      'telefono',
    ])
    // Todo aterrizo en un campo: el banner sobra.
    expect(resultado.general).toBeNull()
  })

  it('ancla la cota COMPUESTA del documento (`Persona` a secas) en numeroDocumento', () => {
    const resultado = repartirErroresDelAlta(
      error400({ Persona: [{ code: 'validation.documento.max_length' }] }),
      traducir,
    )

    expect(resultado.campos).toEqual([['numeroDocumento', 't:validation.documento.max_length']])
    expect(resultado.general).toBeNull()
  })

  it('manda al BANNER el modo_invalido, que llega con PropertyName vacio', () => {
    const resultado = repartirErroresDelAlta(
      error400({ '': [{ code: 'validation.persona.modo_invalido' }] }),
      traducir,
    )

    expect(resultado.campos).toEqual([])
    expect(resultado.general).toBe('t:validation.persona.modo_invalido')
  })

  it('manda al BANNER los rechazos declarados que el modal ni dibuja', () => {
    const licencia = repartirErroresDelAlta(
      error400({ Licencia: [{ code: 'validation.licencia.sin_destino' }] }),
      traducir,
    )
    const invitacion = repartirErroresDelAlta(
      error400({ EnviarInvitacion: [{ code: 'validation.enviar_invitacion.no_soportado' }] }),
      traducir,
    )

    expect(licencia.general).toBe('t:validation.licencia.sin_destino')
    expect(licencia.campos).toEqual([])
    expect(invitacion.general).toBe('t:validation.enviar_invitacion.no_soportado')
    expect(invitacion.campos).toEqual([])
  })

  it('un huerfano gana el banner aunque haya campos marcados', () => {
    const resultado = repartirErroresDelAlta(
      error400({
        'Persona.Nombre': [{ code: 'validation.nombre.required' }],
        '': [{ code: 'validation.persona.modo_invalido' }],
      }),
      traducir,
    )

    expect(resultado.campos).toEqual([['nombre', 't:validation.nombre.required']])
    expect(resultado.general).toBe('t:validation.persona.modo_invalido')
  })

  it('mapea los campos PLANOS del request (Modo A y operativos) sin tocarlos', () => {
    const resultado = repartirErroresDelAlta(
      error400({
        PersonaId: [{ code: 'validation.persona_id.invalid' }],
        NumeroLegajo: [{ code: 'validation.numero_legajo.max_length' }],
      }),
      traducir,
    )

    expect(resultado.campos.map(([campo]) => campo)).toEqual(['personaId', 'numeroLegajo'])
    expect(resultado.general).toBeNull()
  })

  it('sin validation_errors (409/404/500 de negocio) el mensaje sale del code top-level', () => {
    const resultado = repartirErroresDelAlta(
      respuestaDeError(409, {
        status: 409,
        title: 'Conflicto',
        code: 'flota.conductor.persona_ya_es_conductor',
        message_key: 'errors.flota.conductor.persona_ya_es_conductor',
      }),
      traducir,
    )

    expect(resultado.campos).toEqual([])
    expect(resultado.general).toBe('t:errors.flota.conductor.persona_ya_es_conductor')
  })
})
