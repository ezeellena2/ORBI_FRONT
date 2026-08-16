import { z } from 'zod'
import type { SilenciarProblemaRequest } from '@/services/contracts/flota'
import { silenciarHastaUtc } from '../vocabulario-sala-problemas'

/**
 * Schema del modal "Silenciar problema" — `POST /problemas/{id}/silenciar`.
 *
 * Los **4** campos del request son obligatorios (`dtos.ts` §9) y el `ValidationActionFilter` los
 * rechaza con 400 `ValidationProblemDetails` antes de que el service corra. Los mensajes de Zod son
 * los **mismos `WithErrorCode`** que emite `SilenciarProblemaRequestValidator`
 * (`validation.motivo.required`, `validation.motivo.max_length`), así que el error local y el del
 * backend resuelven la misma clave i18n y el usuario lee el mismo texto por los dos caminos.
 *
 * ── LA VENTANA VIAJA COMO INSTANTE, NO COMO DURACIÓN ──────────────────────────────────────────
 * El request lleva `silenciarHastaUtc` absoluto y **no** trae un "desde": el silencio arranca ahora.
 * El formulario elige una **duración** (que es lo que el operador piensa) y se traduce a instante en
 * `aSilenciarProblemaRequest`, con el reloj entrando por parámetro para que la función sea pura.
 *
 * Las opciones son 2 y no las 3 de la ficha §6: ver `VENTANAS_DE_SILENCIO_MINUTOS` — "hasta fin de
 * turno" no tiene definición en ningún documento del contrato.
 */

/** Los valores viajan como string porque es lo que emite `GrupoRadio`. */
export const silenciarProblemaSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, 'validation.motivo.required')
    .max(500, 'validation.motivo.max_length'),
  ventanaMinutos: z.enum(['30', '120']),
  silenciarNotificaciones: z.boolean(),
  silenciarWebhooks: z.boolean(),
})

export type SilenciarProblemaFormulario = z.infer<typeof silenciarProblemaSchema>

/**
 * Posición inicial de los 2 toggles.
 *
 * ⚠️ **El contrato no fija ningún default y el backend tampoco lo inventó** (`PoliticaSilencio`
 * declara la PENDIENTE de §6: si el silencio alcanza a los webhooks externos por defecto queda sin
 * decidir). Un toggle siempre tiene un valor, así que la UI elige una posición inicial **visible y
 * cambiable antes de confirmar**, no un valor oculto:
 *
 *  - `silenciarNotificaciones: true` — es el significado literal de la acción que el usuario acaba
 *    de elegir. Arrancar en `false` haría que "Silenciar" no silencie nada.
 *  - `silenciarWebhooks: false` — apagar la salida hacia los sistemas del cliente es un efecto que
 *    excede a esta organización y no puede ser el default silencioso. Además hoy es **inerte**: no
 *    existe fan-out de problemas a webhooks (PENDIENTE #3), así que ninguna entrega sale por un
 *    problema y el valor solo se persiste para cuando exista.
 */
export const SILENCIO_POR_DEFECTO = {
  silenciarNotificaciones: true,
  silenciarWebhooks: false,
} as const

export function aSilenciarProblemaRequest(
  valores: SilenciarProblemaFormulario,
  ahoraMs: number,
): SilenciarProblemaRequest {
  return {
    motivo: valores.motivo.trim(),
    silenciarHastaUtc: silenciarHastaUtc(ahoraMs, Number(valores.ventanaMinutos)),
    silenciarNotificaciones: valores.silenciarNotificaciones,
    silenciarWebhooks: valores.silenciarWebhooks,
  }
}
