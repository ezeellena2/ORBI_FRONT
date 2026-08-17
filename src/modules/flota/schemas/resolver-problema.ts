import { z } from 'zod'
import type { ResolverProblemaRequest } from '@/services/contracts/flota'

/**
 * Schema del modal "Resolver problema" — `POST /problemas/{id}/resolver`, el cierre **TERMINAL**.
 *
 * `resultado` son los **2** estados terminales del catálogo de 7 (`resuelto` | `descartado`), que es
 * exactamente el union del contrato; el enum de acá lo replica para que agregar un tercero no
 * compile. `evidencia` vacía da **400** y es criterio de aceptación del slice, así que se exige
 * también del lado del cliente — no para reemplazar la validación del backend, sino para que el
 * usuario no pierda lo escrito en un viaje de ida y vuelta.
 *
 * Los mensajes son los mismos `WithErrorCode` de `ResolverProblemaRequestValidator`
 * (`validation.resultado.required`, `validation.evidencia.required`,
 * `validation.evidencia.max_length`, tope **2000**), así que el error local y el del backend
 * resuelven la misma clave i18n.
 *
 * ⚠️ **`crearEventoCierreIntegracion` NO se ofrece.** El campo existe en el request y el backend lo
 * **acepta sin disparar nada** (DA-IN-08: emitir el cierre al plano público exige el mapeo
 * evento-interno ↔ evento-público, que no existe, y además ningún endpoint tiene suscripciones).
 * Un toggle que promete avisarle a un sistema externo y no avisa es peor que no tenerlo; el modal
 * lo dice en una línea (`centro.resolver.aclaracionIntegracion`) y el campo viaja **ausente**, que
 * es lo único que no afirma nada.
 */
export const resolverProblemaSchema = z.object({
  resultado: z.enum(['resuelto', 'descartado'], { error: 'validation.resultado.required' }),
  evidencia: z
    .string()
    .trim()
    .min(1, 'validation.evidencia.required')
    .max(2000, 'validation.evidencia.max_length'),
})

export type ResolverProblemaFormulario = z.infer<typeof resolverProblemaSchema>

export function aResolverProblemaRequest(
  valores: ResolverProblemaFormulario,
): ResolverProblemaRequest {
  return {
    resultado: valores.resultado,
    evidencia: valores.evidencia.trim(),
  }
}
