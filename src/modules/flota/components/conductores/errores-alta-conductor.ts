import {
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import type { CrearConductorFormulario } from '../../schemas/crear-conductor'

/**
 * Reparto de un 400 del alta de conductor entre los campos del formulario y el banner general.
 *
 * ── POR QUE HACE FALTA UNA TABLA Y NO ALCANZA `resolveApiFieldErrors` ─────────────────────────
 * `CrearConductorRequest` es el **primer request ANIDADO del modulo** (los de vehiculos y
 * dispositivos son planos), y el formulario del modal es **plano**. Las reglas del Modo B se
 * declaran sobre `x.Persona!.Nombre`, `x.Persona!.NumeroDocumento`, etc., asi que
 * `ValidationActionFilter` agrupa por ese `PropertyName` y `normalizeFieldName` lo camelliza ENTERO:
 * `Persona.Nombre` → **`personaNombre`**, que no es ningun campo del formulario.
 *
 * Sin este reparto pasaba lo peor posible: `form.setError('personaNombre')` escribia en un campo que
 * ningun `<Campo error=…>` lee, y el banner quedaba apagado porque `hasApiFieldErrors` daba `true`.
 * Resultado neto: el usuario apretaba "Crear conductor" y **no pasaba absolutamente nada visible**.
 *
 * ── LO QUE NO TIENE CAMPO VA AL BANNER, NUNCA AL VACIO ────────────────────────────────────────
 * `validation.persona.modo_invalido` se declara con `RuleFor(x => x)` ⇒ `PropertyName` **vacio**, y
 * los 2 rechazos declarados (`licencia.sin_destino`, `enviar_invitacion.no_soportado`) cuelgan de
 * campos que el modal ni dibuja. Todos esos son **huerfanos**: se muestran arriba del formulario.
 */

/** Clave que produce `normalizeFieldName` → campo real del formulario. */
const CAMPOS_DEL_SERVIDOR = new Map<string, keyof CrearConductorFormulario>([
  ['personaId', 'personaId'],
  ['numeroLegajo', 'numeroLegajo'],
  ['notas', 'notas'],
  ['personaTipoDocumento', 'tipoDocumento'],
  ['personaNumeroDocumento', 'numeroDocumento'],
  ['personaNombre', 'nombre'],
  ['personaApellido', 'apellido'],
  ['personaTelefono', 'telefono'],
  /*
    `RuleFor(x => x.Persona!)` con `validation.documento.max_length` llega como `persona` a secas: la
    cota es de la CONCATENACION `"{tipo} {numero}"`. Se ancla en `numeroDocumento`, que es el campo
    que el usuario puede acortar (el tipo sale de un select cerrado) — y es exactamente donde Zod
    ancla la misma regla del lado del cliente.
  */
  ['persona', 'numeroDocumento'],
])

export interface ErroresAltaConductor {
  /** Mensaje del banner. `null` = todo el error aterrizo en algun campo. */
  general: string | null
  /** Pares `[campo del formulario, mensaje ya resuelto por i18n]`. */
  campos: Array<[keyof CrearConductorFormulario, string]>
}

type FuncionDeTraduccion = (clave: string, opciones?: Record<string, unknown>) => string

export function repartirErroresDelAlta(
  error: unknown,
  traducir: FuncionDeTraduccion,
): ErroresAltaConductor {
  const apiError = parseApiError(error)
  const porClave = resolveApiFieldErrors(apiError, traducir)

  const campos: Array<[keyof CrearConductorFormulario, string]> = []
  const huerfanos: string[] = []

  for (const [clave, mensaje] of Object.entries(porClave)) {
    const campo = CAMPOS_DEL_SERVIDOR.get(clave)
    if (campo === undefined) {
      huerfanos.push(mensaje)
      continue
    }
    campos.push([campo, mensaje])
  }

  // Un huerfano SIEMPRE gana el banner: es un rechazo que el usuario no puede ver de otra forma.
  // Sin huerfanos y con campos marcados, el banner sobra (el error ya esta al lado del input).
  // Sin nada de nada (409/404/500 de negocio), el mensaje sale del `code` top-level.
  if (huerfanos.length > 0) {
    return { general: huerfanos[0], campos }
  }

  return {
    general: campos.length > 0 ? null : resolveApiErrorMessage(apiError, traducir),
    campos,
  }
}
