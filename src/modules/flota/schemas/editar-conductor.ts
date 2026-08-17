import { z } from 'zod'
import type { ActualizarConductorRequest, ConductorDetalleDto } from '@/services/contracts/flota'

/**
 * Schema del modal "Editar conductor" (`PATCH /api/flota/conductores/{id}`, `f-05` §4 / `f-06` §9).
 *
 * Replica UNA A UNA `ActualizarConductorRequestValidator` y usa SU MISMO `WithErrorCode`. El
 * validator tiene **una sola regla de forma** (el tope de 50 del legajo), asi que acá tampoco hay
 * mas: `notas` no lleva maximo porque el backend no se lo pone.
 *
 * ── SOLO DATOS OPERATIVOS ─────────────────────────────────────────────────────────────────────
 * Nombre, DNI, CUIL, email, telefono y direccion son **proyeccion canonica READ-ONLY** (P-A) y
 * `ActualizarConductorRequest` **ni siquiera los declara**: no hay forma de que Flota escriba el
 * canonico por este verbo. El mockup los muestra editables y **esta mal**; el modal los pinta
 * deshabilitados con la leyenda de Persona, que es distinto de esconderlos (el usuario tiene que
 * poder leerlos para confirmar que es la persona correcta).
 *
 * ── LA LICENCIA NO SE EDITA ACA ───────────────────────────────────────────────────────────────
 * El Validator la **RECHAZA con 400** `validation.licencia.sin_destino` (no la descarta en
 * silencio). Se carga como documento con `tipoDocumento: 'licencia'` desde el tab de documentos.
 *
 * ── EL TOGGLE "CONDUCTOR ACTIVO" TAMPOCO VA ───────────────────────────────────────────────────
 * Activar/desactivar es `POST .../baja` + `POST .../reactivar`, con **otro permiso** (`eliminar` /
 * `editar`). Un toggle acá ejecutaria una baja con el permiso de edicion.
 */

/** `conductores_flota.numero_legajo`, mismo tope que en el alta. */
const LEGAJO_LARGO_MAXIMO = 50

export const editarConductorSchema = z.object({
  numeroLegajo: z.string().trim().max(LEGAJO_LARGO_MAXIMO, 'validation.numero_legajo.max_length'),
  notas: z.string().trim(),
})

export type EditarConductorFormulario = z.infer<typeof editarConductorSchema>

export function valoresInicialesEditarConductor(
  conductor: ConductorDetalleDto,
): EditarConductorFormulario {
  return {
    // Los nullable caen a `''`: un input controlado con `null` pasa a no-controlado, que en React es
    // un warning y un valor que no se puede tipear.
    numeroLegajo: conductor.numeroLegajo ?? '',
    notas: conductor.notas ?? '',
  }
}

/**
 * Se manda el objeto completo de los campos editables, no un diff — mismo criterio que los otros 2
 * `PATCH` del modulo: `System.Text.Json` no distingue "campo ausente" de "campo en null", asi que
 * mandar el estado que se quiere dejar da el mismo resultado con cualquiera de las dos lecturas.
 */
export function aActualizarConductorRequest(
  valores: EditarConductorFormulario,
): ActualizarConductorRequest {
  const texto = (valor: string) => (valor.trim().length > 0 ? valor.trim() : undefined)

  return {
    numeroLegajo: texto(valores.numeroLegajo),
    notas: texto(valores.notas),
  }
}

/**
 * Campos que el usuario vacio pero que el `PATCH` **NO puede borrar** (B-18, abierta).
 *
 * Tercer gemelo de `camposQueNoSePuedenBorrar` (vehiculo) y `camposDispositivoQueNoSePuedenBorrar`:
 * mismo defecto de plataforma, mismo tratamiento. El service resuelve la ambiguedad de
 * `System.Text.Json` PRESERVANDO (`request.X ?? entidad.X`), asi que vaciar el legajo hoy es un
 * **no-op con 200 OK**: el modal cerraria en verde y el dato seguiria ahi, sin un solo mensaje.
 *
 * Se avisa ANTES de guardar. No bloquea el submit: el resto de los cambios SI se guarda.
 */
export function camposConductorQueNoSePuedenBorrar(
  // Parcial: la fuente es `useWatch`, que tipa los campos como opcionales. Un campo todavia sin
  // registrar no es "vaciado" — es "no lo tocaron".
  valores: Partial<EditarConductorFormulario>,
  actual: { numeroLegajo?: string | null; notas?: string | null },
): Array<keyof EditarConductorFormulario> {
  const vaciado = (nuevo: string | undefined, previo: string | null | undefined) =>
    nuevo !== undefined &&
    nuevo.trim().length === 0 &&
    previo !== null &&
    previo !== undefined &&
    previo !== ''

  const campos: Array<keyof EditarConductorFormulario> = []
  if (vaciado(valores.numeroLegajo, actual.numeroLegajo)) campos.push('numeroLegajo')
  if (vaciado(valores.notas, actual.notas)) campos.push('notas')
  return campos
}
