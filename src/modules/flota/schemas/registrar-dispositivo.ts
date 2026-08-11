import { z } from 'zod'
import type { RegistrarDispositivoRequest } from '@/services/contracts/flota'

/**
 * Schema del modal "Registrar dispositivo GPS" (`POST /api/flota/dispositivos`, `f-05` §7).
 *
 * Replica UNA A UNA `Flota.Application/Validators/RegistrarDispositivoRequestValidator.cs` y usa
 * LOS MISMOS `WithErrorCode`: `validation.imei.length_invalid` es a la vez la clave i18n del error
 * local de Zod y la del 400 del backend, asi que el usuario lee el mismo texto venga de donde venga
 * el rechazo. Nada de limites inventados: un tope de cliente que el servidor no tiene es una regla
 * fantasma.
 *
 * ── SOLO MODO A ───────────────────────────────────────────────────────────────────────────────
 * El IMEI que se tipea tiene que existir ya en el registro canonico. El **Modo B** (alta de un
 * equipo nuevo desde Flota, `dispositivoNuevo`) esta BLOQUEADO: `plataforma_canonica.dispositivos`
 * exige un `traccar_device_id` que NADA en la solucion genera (**B-7**) y el backend responde
 * siempre 400 `flota.dispositivo.alta_modo_b_no_soportado`. Por eso el formulario no tiene el
 * bloque "crear equipo nuevo": seria un form que no puede guardar. La restriccion se DICE en el
 * texto de ayuda del IMEI en vez de dejarla como sorpresa del 404.
 *
 * `dispositivoCanonicoId` tampoco se pide: es opcional en el contrato y el usuario no tiene de
 * donde sacar ese uuid — el backend lo resuelve por IMEI. Mandarlo mal produce 404
 * `flota.dispositivo.canonico_no_existe` sin ninguna ganancia.
 *
 * ── QUE NO ENTRA, Y POR QUE ───────────────────────────────────────────────────────────────────
 *  - `costoAdquisicionUsd` / `ubicacionDeposito`: BORRADOS del contrato (D-S3-12). No existen las
 *    columnas y `System.Text.Json` los descartaba en silencio.
 *  - `alias` NO se valida como unico: **D-S3-34** confirmo que esa unicidad nunca existio (no hay
 *    indice y `flota.dispositivo.alias_duplicado` no tiene emisor). Es B-15, del PO.
 *  - `notasOperativas` no tiene regla en el validator backend: no se le inventa un maximo.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

/** Estandar GSM: 15 digitos, 16 con el digito de software. El validator backend acepta 14-20. */
const IMEI_LARGO_MINIMO = 14
const IMEI_LARGO_MAXIMO = 20
const SOLO_DIGITOS = /^\d+$/

export const registrarDispositivoSchema = z.object({
  imei: z
    .string()
    .trim()
    .min(1, 'validation.imei.required')
    .min(IMEI_LARGO_MINIMO, 'validation.imei.length_invalid')
    .max(IMEI_LARGO_MAXIMO, 'validation.imei.length_invalid')
    .regex(SOLO_DIGITOS, 'validation.imei.format_invalid'),

  alias: z
    .string()
    .trim()
    .min(1, 'validation.alias.required')
    .max(100, 'validation.alias.max_length'),

  /** `''` = sin elegir. Uuid del catalogo growable cuando viaja; OPCIONAL desde **D-S3-5**. */
  modeloId: z.string(),

  numeroSerie: z.string().trim().max(100, 'validation.numero_serie.max_length'),

  numeroSim: z.string().trim().max(30, 'validation.numero_sim.max_length'),

  /** `''` = sin elegir. Uuid del catalogo growable. */
  proveedorSimId: z.string(),

  notasOperativas: z.string().trim(),
})

export type RegistrarDispositivoFormulario = z.infer<typeof registrarDispositivoSchema>

export const VALORES_INICIALES_REGISTRAR_DISPOSITIVO: RegistrarDispositivoFormulario = {
  imei: '',
  alias: '',
  modeloId: '',
  numeroSerie: '',
  numeroSim: '',
  proveedorSimId: '',
  notasOperativas: '',
}

/**
 * Los campos opcionales vacios se OMITEN (`undefined`), no viajan como `''`.
 *
 * `JSON.stringify` descarta las propiedades `undefined`, asi que el backend recibe el campo ausente
 * y no lo toca. Un `''` en `modeloId` seria un uuid invalido y produciria un 400 de forma
 * (`validation.modelo_id.invalid`) por no haber elegido algo que es opcional.
 */
export function aRegistrarDispositivoRequest(
  valores: RegistrarDispositivoFormulario,
): RegistrarDispositivoRequest {
  const texto = (valor: string) => (valor.trim().length > 0 ? valor.trim() : undefined)

  return {
    imei: valores.imei.trim(),
    alias: valores.alias.trim(),
    modeloId: texto(valores.modeloId),
    numeroSerie: texto(valores.numeroSerie),
    numeroSim: texto(valores.numeroSim),
    proveedorSimId: texto(valores.proveedorSimId),
    notasOperativas: texto(valores.notasOperativas),
  }
}
