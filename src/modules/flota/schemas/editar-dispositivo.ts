import { z } from 'zod'
import type {
  ActualizarDispositivoRequest,
  DispositivoDetalleDto,
} from '@/services/contracts/flota'

/**
 * Schema del modal "Editar dispositivo" (`f-05` §7 / `f-06` §5).
 *
 * Replica UNA A UNA `Flota.Application/Validators/ActualizarDispositivoRequestValidator.cs` y usa
 * LOS MISMOS `WithErrorCode`: `validation.alias.max_length` es a la vez la clave i18n del error
 * local de Zod y la del 400 del backend. Nada mas: un limite de cliente que el servidor no tiene es
 * una regla fantasma.
 *
 * ── QUE NO ENTRA EN EL FORM, Y POR QUE ────────────────────────────────────────────────────────
 *  - **IMEI y numero de serie**: read-only DESPUES DEL ALTA por contrato (DA-DL-09 / D-S3-24).
 *    `ActualizarDispositivoRequest` no los expone; se muestran bloqueados en el modal.
 *  - **`fabricante`**: se DERIVA del catalogo de modelos (D-S3-25). No es un campo propio del
 *    dispositivo: cambia cuando cambia el modelo, y editarlo aparte crearia las dos verdades que el
 *    contrato prohibe.
 *  - **`costoAdquisicionUsd` y `ubicacionDeposito`**: BORRADOS del contrato (D-S3-12). No existian
 *    las columnas y `System.Text.Json` los DESCARTABA en silencio: el form mandaba el valor,
 *    recibia 200 y el dato se perdia sin un solo error.
 *  - **`alias` no se valida como unico**: `dtos.ts` lo prometia, pero **D-S3-34** confirmo que esa
 *    unicidad nunca existio (no hay indice y `flota.dispositivo.alias_duplicado` no tiene emisor).
 *    Es B-15, del PO. El form manda lo que haya y deja decidir al backend.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

export const editarDispositivoSchema = z.object({
  alias: z.string().trim().max(100, 'validation.alias.max_length'),
  /** `''` = sin eleccion. Uuid del catalogo growable cuando viaja (B-18), jamas texto libre. */
  modeloId: z.string(),
  numeroSim: z.string().trim().max(30, 'validation.numero_sim.max_length'),
  /** `''` = sin proveedor. Ver la asimetria con `modeloId` en `aActualizarDispositivoRequest`. */
  proveedorSimId: z.string(),
  notasOperativas: z.string().trim(),
})

export type EditarDispositivoFormulario = z.infer<typeof editarDispositivoSchema>

export function valoresInicialesEditarDispositivo(
  dispositivo: DispositivoDetalleDto,
): EditarDispositivoFormulario {
  return {
    // Los campos nullable del DTO (D-S3-12) caen a `''`: un input controlado con `null` pasa a
    // no-controlado, que en React es un warning y un valor que no se puede tipear.
    alias: dispositivo.alias ?? '',
    modeloId: dispositivo.modeloId ?? '',
    numeroSim: dispositivo.numeroSim ?? '',
    proveedorSimId: dispositivo.proveedorSimId ?? '',
    notasOperativas: dispositivo.notasOperativas ?? '',
  }
}

/**
 * Se manda el objeto completo de los campos editables, no un diff.
 *
 * Motivo (identico al PATCH de vehiculos): `System.Text.Json` no distingue "campo ausente" de
 * "campo en null", asi que la semantica de omitir depende de como lo resuelva el service. Mandar el
 * estado completo que se quiere dejar da el mismo resultado con cualquiera de las dos lecturas.
 *
 * ── NINGUN CAMPO SE PUEDE VACIAR. LOS CINCO SE COMPORTAN IGUAL ────────────────────────────────
 * ⚠️ Corregido contra el codigo que corre. Aca decia que `proveedorSimId` admitia `null` explicito
 * y DESVINCULABA, y que la asimetria con `modeloId` era un pendiente del PO. **Las dos cosas eran
 * falsas.** `DispositivoGpsService` resuelve los dos campos con el mismo `??`:
 *
 *     var modeloIdEfectivo       = request.ModeloId       ?? dispositivo.ModeloId;
 *     var proveedorSimIdEfectivo = request.ProveedorSimId ?? dispositivo.ProveedorSimId;
 *
 * y lo documenta: `System.Text.Json` no distingue "ausente" de "null", asi que un PATCH que solo
 * cambia el alias desvincularia el proveedor con 200 OK y sin forma de recuperarlo — ante la
 * ambiguedad se PRESERVA. Lo mismo vale para los 3 campos de texto (`JSON.stringify` descarta las
 * propiedades `undefined` y el backend lee "ausente" como "no lo toques").
 *
 * Consecuencia: el pendiente del PO es **UNO SOLO**, no dos con distinta forma — poder expresar el
 * borrado explicito (`Optional<T>` o JSON Merge Patch). Hasta entonces vaciar cualquiera de los 5
 * campos es un no-op, y los selects lo DICEN en su ayuda en vez de cerrar en verde sin cambiar nada.
 *
 * `proveedorSimId` se sigue mandando como `null` y no como `undefined` a proposito: es lo que
 * `dtos.ts` (00-contrato, la autoridad maxima) declara, hoy da el mismo resultado, y el dia que el
 * backend distinga ausente de null este formulario ya expresa la intencion correcta.
 */
export function aActualizarDispositivoRequest(
  valores: EditarDispositivoFormulario,
): ActualizarDispositivoRequest {
  const texto = (valor: string) => (valor.trim().length > 0 ? valor.trim() : undefined)

  return {
    alias: texto(valores.alias),
    modeloId: texto(valores.modeloId),
    numeroSim: texto(valores.numeroSim),
    proveedorSimId: texto(valores.proveedorSimId) ?? null,
    notasOperativas: texto(valores.notasOperativas),
  }
}

/**
 * Campos que el usuario vacio pero que el `PATCH` NO puede borrar (ver el bloque de arriba).
 *
 * Gemelo de `camposQueNoSePuedenBorrar` de `editar-vehiculo.ts`: mismo problema, mismo tratamiento.
 * Sirve para avisarle ANTES de guardar, en vez de cerrar el modal con un "exito" que descarto su
 * cambio en silencio.
 *
 * Los 2 selects de catalogo entran aca igual que los 3 textos: `modeloId` y `proveedorSimId` se
 * preservan con el mismo `??` del service, asi que vaciarlos tampoco desvincula.
 */
export function camposDispositivoQueNoSePuedenBorrar(
  // Parcial: la fuente es `useWatch`, que tipa los campos como opcionales. Un campo todavia sin
  // registrar no es "vaciado" — es "no lo tocaron", y `vaciado` lo trata como tal.
  valores: Partial<EditarDispositivoFormulario>,
  actual: {
    alias?: string | null
    modeloId?: string | null
    numeroSim?: string | null
    proveedorSimId?: string | null
    notasOperativas?: string | null
  },
): Array<keyof EditarDispositivoFormulario> {
  const vaciado = (nuevo: string | undefined, previo: string | null | undefined) =>
    nuevo !== undefined &&
    nuevo.trim().length === 0 &&
    previo !== null &&
    previo !== undefined &&
    previo !== ''

  const campos: Array<keyof EditarDispositivoFormulario> = []
  if (vaciado(valores.alias, actual.alias)) campos.push('alias')
  if (vaciado(valores.modeloId, actual.modeloId)) campos.push('modeloId')
  if (vaciado(valores.numeroSim, actual.numeroSim)) campos.push('numeroSim')
  if (vaciado(valores.proveedorSimId, actual.proveedorSimId)) campos.push('proveedorSimId')
  if (vaciado(valores.notasOperativas, actual.notasOperativas)) campos.push('notasOperativas')
  return campos
}
