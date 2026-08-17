import { z } from 'zod'
import type { CrearVehiculoRequest } from '@/services/contracts/flota'

/**
 * Schema del paso 1 del wizard de alta (`f-07`).
 *
 * Replica UNA A UNA las reglas de `Flota.Application/Validators/CrearVehiculoRequestValidator.cs`
 * y usa LOS MISMOS `WithErrorCode`. Eso no es cosmético: el mismo string
 * (`validation.patente.required`) es la clave i18n que resuelve el error local de Zod Y el error
 * del 400 del backend, así que el usuario lee el mismo texto venga de donde venga el rechazo.
 *
 * Año 1950-2030 (DA-ON-06). El `min=1990` del mockup NO se porta: el mockup es referencia UX, no
 * fuente de reglas.
 *
 * `tipo` NO se valida contra el catálogo acá: el catálogo de tipos es CANÓNICO y quien lo valida es
 * PlataformaCanónica al resolver-o-crear (mismo razonamiento que el Validator backend). Duplicar la
 * lista sería un catálogo de negocio en código.
 *
 * `combustible` NO se declara: sigue PENDIENTE (C-6) — no tiene columna fuente ni en Flota ni en el
 * canónico, así que el formulario no lo renderiza y el request no lo manda.
 */

export const ANIO_MINIMO = 1950
export const ANIO_MAXIMO = 2030

const SOLO_DIGITOS = /^\d+$/

/**
 * Todos los campos viajan como `string` dentro del formulario, incluidos año y kilometraje.
 *
 * Es a propósito: un `<input type="number">` vacío con `valueAsNumber` entrega `NaN`, y `NaN` hace
 * fallar el chequeo de TIPO de Zod antes de llegar a la regla de rango — el usuario terminaría
 * leyendo "se esperaba un número" en vez del código real del backend. Con strings, cada campo falla
 * con su propio code y el mapeo a números ocurre en un solo lugar (`aCrearVehiculoRequest`).
 */
export const crearVehiculoSchema = z.object({
  patente: z
    .string()
    .trim()
    .min(1, 'validation.patente.required')
    .max(20, 'validation.patente.max_length'),

  marca: z
    .string()
    .trim()
    .min(1, 'validation.marca.required')
    .max(50, 'validation.marca.max_length'),

  modelo: z
    .string()
    .trim()
    .min(1, 'validation.modelo.required')
    .max(50, 'validation.modelo.max_length'),

  /**
   * Ids del catálogo canónico. NO se validan ni son requeridos: son el ANCLA INTERMEDIA, y su
   * ausencia es un estado válido (identidad por texto libre) mientras el catálogo no cubra ese
   * vehículo. Exigirlos trabaría el alta de un auto real que el catálogo todavía no tiene.
   *
   * `marcaId` no viaja al backend: sirve solo para filtrar los modelos de esa marca. El que viaja
   * es `modeloId`, que ya implica la marca por la cascada.
   */
  marcaId: z.string(),
  modeloId: z.string(),

  anio: z
    .string()
    .trim()
    .refine(
      (valor) =>
        SOLO_DIGITOS.test(valor) &&
        Number(valor) >= ANIO_MINIMO &&
        Number(valor) <= ANIO_MAXIMO,
      'validation.anio.range_invalid',
    ),

  tipo: z.string().trim().min(1, 'validation.tipo.required'),

  // ── Opcionales: viven en la sección colapsada del paso 1 (DA-ON-03) ──────────────────────────
  vin: z.string().trim().max(17, 'validation.vin.max_length'),

  color: z.string().trim(),

  // `SOLO_DIGITOS` ya rechaza el signo menos, así que "-5" cae en el code de negativo del backend.
  kilometrajeInicial: z
    .string()
    .trim()
    .refine(
      (valor) => valor === '' || SOLO_DIGITOS.test(valor),
      'validation.kilometraje_inicial.negative',
    ),

  notasOperativas: z.string().trim(),
})

export type CrearVehiculoFormulario = z.infer<typeof crearVehiculoSchema>

export const valoresInicialesCrearVehiculo: CrearVehiculoFormulario = {
  patente: '',
  marca: '',
  modelo: '',
  marcaId: '',
  modeloId: '',
  anio: '',
  tipo: '',
  vin: '',
  color: '',
  kilometrajeInicial: '',
  notasOperativas: '',
}

/** Un opcional vacío se OMITE del request; mandarlo como `''` persistiría un string vacío. */
function textoOpcional(valor: string): string | undefined {
  const limpio = valor.trim()
  return limpio.length > 0 ? limpio : undefined
}

export function aCrearVehiculoRequest(valores: CrearVehiculoFormulario): CrearVehiculoRequest {
  const kilometraje = textoOpcional(valores.kilometrajeInicial)

  return {
    // El uppercase también se aplica mientras se tipea; acá se repite porque el request se arma
    // desde los valores del form y no desde lo que se ve en pantalla.
    patente: valores.patente.trim().toUpperCase(),
    // El TEXTO viaja siempre, haya o no id: el Canónico guarda las dos cosas —el id para decidir,
    // el texto para mostrar— y esa convivencia es deliberada, no redundancia.
    marca: valores.marca.trim(),
    modelo: valores.modelo.trim(),
    // El ancla intermedia, solo si el usuario ELIGIÓ del catálogo. `marcaId` NO viaja: ya está
    // implicada por la cascada (modelo → marca), y mandarla sería una segunda verdad del mismo dato.
    modeloId: textoOpcional(valores.modeloId),
    anio: Number(valores.anio),
    // Código snake_case del catálogo canónico. Lo que se muestra es la etiqueta traducida; lo que
    // viaja es este mismo string.
    tipo: valores.tipo,
    vin: textoOpcional(valores.vin),
    color: textoOpcional(valores.color),
    kilometrajeInicial: kilometraje === undefined ? undefined : Number(kilometraje),
    notasOperativas: textoOpcional(valores.notasOperativas),
  }
}
