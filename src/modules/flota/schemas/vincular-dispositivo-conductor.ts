import { z } from 'zod'
import type { AsignarDispositivoConductorRequest } from '@/services/contracts/flota'

/**
 * Schema del modal "Vincular dispositivo" del conductor
 * (`POST /api/flota/conductores/{id}/dispositivos`, permiso `flota.conductores.asignar-dispositivo`).
 *
 * ⚠️ NO ES INSTALAR EL GPS EN UN VEHICULO. Ese otro vinculo es 1:1, cuelga del vehiculo y tiene su
 * propio permiso (`flota.vehiculos.asignar-dispositivo`). Este es **N:N de ATRIBUCION** (espeja el
 * driver↔device de Traccar): no mueve el estado de stock del equipo, no lo pone `instalado` y no
 * hace que Telemetria acepte posiciones. **La posicion del conductor deriva SIEMPRE del vehiculo que
 * conduce** (D1), nunca de este dispositivo.
 *
 * Replica `AsignarDispositivoConductorRequestValidator` con SUS `WithErrorCode`:
 * `validation.dispositivo_flota_id.required` y `validation.notas.max_length` (500).
 *
 * ⚠️ **`fechaEntrega` NO se declara** aunque `dtos.ts` la de como opcional y el mockup dibuje el
 * campo: el backend **no la implementa**. Aceptar un inicio elegido por el cliente permitiria abrir
 * un periodo en el futuro o anterior a otro que se cierra, y `errores.md` no tiene `code` con el que
 * rechazar esos casos (mismo criterio que `fechaInicio` en la asignacion de dispositivo, D-S3-16). Un
 * campo cuyo valor se descarta en silencio no se dibuja.
 */
export const vincularDispositivoConductorSchema = z.object({
  /** `''` = sin elegir. Id LOCAL del GPS de la flota. */
  dispositivoFlotaId: z.string().min(1, 'validation.dispositivo_flota_id.required'),
  notas: z.string().trim().max(500, 'validation.notas.max_length'),
})

export type VincularDispositivoConductorFormulario = z.infer<
  typeof vincularDispositivoConductorSchema
>

export const VALORES_INICIALES_VINCULAR_DISPOSITIVO: VincularDispositivoConductorFormulario = {
  dispositivoFlotaId: '',
  notas: '',
}

export function aAsignarDispositivoConductorRequest(
  valores: VincularDispositivoConductorFormulario,
): AsignarDispositivoConductorRequest {
  const notas = valores.notas.trim()

  return {
    dispositivoFlotaId: valores.dispositivoFlotaId,
    notas: notas.length > 0 ? notas : undefined,
  }
}
