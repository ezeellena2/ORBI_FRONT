import { z } from 'zod'
import type { CambiarEstadoConductorRequest } from '@/services/contracts/flota'

/**
 * Schema del modal "Cambiar estado del conductor" (`POST .../{id}/estado` -> **204 sin cuerpo**).
 *
 * El enum es el vocabulario CERRADO del request, que **excluye `pendiente_documentacion` POR TIPO**:
 * es el estado con el que nace el conductor y no es destino de este verbo. Que el tipo lo excluya es
 * lo que impide que alguien lo agregue al selector "porque falta".
 *
 * ⚠️ **El vocabulario del request NO es la matriz de transiciones.** Que un destino sea legal como
 * valor no significa que sea alcanzable DESDE el estado actual: eso depende del estado persistido,
 * asi que es 409 `flota.conductor.transicion_invalida` del service, no 400 del Validator. Que
 * destinos se OFRECEN lo decide `destinosDeEstadoConductor` (la matriz de `datos.md` §3.2), y eso es
 * **ergonomia, no autorizacion**: quien decide sigue siendo el servidor.
 *
 * `motivo` replica el `MaximumLength(500)` de `CambiarEstadoConductorRequestValidator` con SU MISMO
 * `WithErrorCode` (`validation.motivo.max_length`), asi que el texto es el mismo venga el rechazo de
 * Zod o del backend. Sin ese cableado el formulario se traba en silencio: con mas de 500 caracteres
 * `handleSubmit` no llama al callback y "Confirmar" no hace nada.
 *
 * ⚠️ `motivo` **NO SE PERSISTE**: no hay columna ni tabla de historial de estado del conductor. Viaja
 * al evento `flota.conductor-operativo-estado-cambiado.v1` y muere ahi. La ayuda del campo lo dice —
 * un "historial de motivos" no tiene fuente.
 */
export const cambiarEstadoConductorSchema = z.object({
  estadoNuevo: z.enum(['disponible', 'en_servicio', 'pausado', 'suspendido']),
  motivo: z.string().trim().max(500, 'validation.motivo.max_length'),
})

export type CambiarEstadoConductorFormulario = z.infer<typeof cambiarEstadoConductorSchema>

export function aCambiarEstadoConductorRequest(
  valores: CambiarEstadoConductorFormulario,
): CambiarEstadoConductorRequest {
  const motivo = valores.motivo.trim()

  return {
    estadoNuevo: valores.estadoNuevo,
    motivo: motivo.length > 0 ? motivo : undefined,
  }
}
