import { z } from 'zod'
import type { ActualizarVehiculoRequest, VehiculoDetalleDto } from '@/services/contracts/flota'

/**
 * Schema del modal "Editar vehículo" (`f-06`).
 *
 * Replica `Flota.Application/Validators/ActualizarVehiculoRequestValidator.cs`, que tiene UNA SOLA
 * regla: kilometraje no negativo. No se inventan largos máximos para `alias` ni `notasOperativas`:
 * el backend no los declara, y un límite de cliente que el servidor no tiene es una regla fantasma.
 *
 * La identidad canónica (patente/marca/modelo/año/tipo/color/VIN) NO entra: Flota no la posee, se
 * muestra bloqueada en el modal y el `PATCH` no la acepta (DA-VD-11).
 *
 * El toggle "Vehículo activo" del mockup tampoco entra: la baja tiene su propio flujo (`DELETE`).
 * `estadoOperativo` existe en el request pero la ficha acota la edición a los datos operativos
 * (alias, kilometraje, notas); ampliarlo lo decide el PO, no se anticipa.
 */

const SOLO_DIGITOS = /^\d+$/

export const editarVehiculoSchema = z.object({
  alias: z.string().trim(),

  // String por el mismo motivo que en el alta: un number input vacío entrega `NaN` y el error de
  // tipo taparía el code real del backend.
  kilometrajeActual: z
    .string()
    .trim()
    .refine(
      (valor) => valor === '' || SOLO_DIGITOS.test(valor),
      'validation.kilometraje_actual.negative',
    ),

  notasOperativas: z.string().trim(),
})

export type EditarVehiculoFormulario = z.infer<typeof editarVehiculoSchema>

export function valoresInicialesEditarVehiculo(
  vehiculo: VehiculoDetalleDto,
): EditarVehiculoFormulario {
  return {
    alias: vehiculo.alias ?? '',
    kilometrajeActual:
      vehiculo.kilometrajeActual === null ? '' : String(vehiculo.kilometrajeActual),
    notasOperativas: vehiculo.notasOperativas ?? '',
  }
}

/**
 * Se manda SIEMPRE el objeto completo con los 3 campos operativos, no un diff.
 *
 * Motivo: `System.Text.Json` no distingue "campo ausente" de "campo en null", así que la semántica
 * de omitir un campo depende de cómo lo resuelva el service — y ya cambió una vez. Mandar el estado
 * completo que se quiere dejar es lo único que da el mismo resultado con cualquiera de las dos
 * interpretaciones.
 *
 * Consecuencia conocida y declarada: hoy NO se puede BORRAR ninguno de los 3 campos desde este
 * modal — vaciar uno lo deja como está. Aplica a `alias`, `notasOperativas` y `kilometrajeActual`
 * por igual: `JSON.stringify` descarta las propiedades `undefined`, así que el campo vaciado no
 * viaja en el body, y el backend trata "ausente" como "no lo toques".
 *
 * El borrado explícito necesita distinguir ausente de null (`Optional<T>` o JSON Merge Patch) y es
 * PENDIENTE (DA-nueva) del PO.
 *
 * Lo que el formulario SÍ tiene que hacer mientras tanto es no mentir: si el usuario vacía un campo
 * que tenía valor, se le avisa que ese cambio no se va a guardar — ver `camposQueNoSePuedenBorrar`.
 */
export function aActualizarVehiculoRequest(
  valores: EditarVehiculoFormulario,
): ActualizarVehiculoRequest {
  const alias = valores.alias.trim()
  const notas = valores.notasOperativas.trim()
  const kilometraje = valores.kilometrajeActual.trim()

  return {
    alias: alias.length > 0 ? alias : undefined,
    kilometrajeActual: kilometraje.length > 0 ? Number(kilometraje) : undefined,
    notasOperativas: notas.length > 0 ? notas : undefined,
  }
}

/**
 * Campos que el usuario vació pero que el `PATCH` no puede borrar (ver arriba). Se usan para
 * avisarle ANTES de guardar, en vez de cerrar el modal con un "éxito" que descartó su cambio en
 * silencio — que es lo que pasaba: borrabas las notas, guardabas, y la nota seguía ahí sin ningún
 * mensaje.
 */
export function camposQueNoSePuedenBorrar(
  // Parcial: la fuente es `useWatch`, que tipa los campos como opcionales.
  valores: Partial<EditarVehiculoFormulario>,
  actual: { alias?: string | null; kilometrajeActual?: number | null; notasOperativas?: string | null },
): Array<'alias' | 'kilometrajeActual' | 'notasOperativas'> {
  const vaciado = (nuevo: string | undefined, previo: unknown) =>
    nuevo !== undefined &&
    nuevo.trim().length === 0 &&
    previo !== null &&
    previo !== undefined &&
    previo !== ''

  const campos: Array<'alias' | 'kilometrajeActual' | 'notasOperativas'> = []
  if (vaciado(valores.alias, actual.alias)) campos.push('alias')
  if (vaciado(valores.kilometrajeActual, actual.kilometrajeActual)) campos.push('kilometrajeActual')
  if (vaciado(valores.notasOperativas, actual.notasOperativas)) campos.push('notasOperativas')
  return campos
}
