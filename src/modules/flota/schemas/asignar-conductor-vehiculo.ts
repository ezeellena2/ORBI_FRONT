import { z } from 'zod'
import type { AsignarConductorRequest } from '@/services/contracts/flota'

/**
 * Schema del modal "Asignar / cambiar conductor" **visto desde el vehiculo** (`f-07` §2) y del paso 3
 * del wizard de alta.
 *
 * Es el gemelo INVERSO de `asignar-vehiculo-conductor.ts`: alla el conductor ya esta elegido y falta
 * el vehiculo; acá el vehiculo ya esta elegido (es la ficha, o el que acaba de crear el wizard) y
 * falta el conductor. El endpoint es el mismo —
 * `POST /api/flota/vehiculos/{vehiculoFlotaId}/asignaciones/conductor`, permiso
 * **`flota.vehiculos.asignar-conductor`**— y por eso el `vehiculoFlotaId` va en la URL, nunca en el
 * body: `dtos.ts` declara `{conductorFlotaId, rol}` y nada mas.
 *
 * Replica `AsignarConductorRequestValidator` con SU `WithErrorCode`:
 * `validation.conductor_flota_id.required`.
 *
 * ⚠️ NO HAY CAMPO "FECHA EFECTIVA", y no es un olvido: `f-07` §2 lo pide, pero
 * `AsignarConductorRequest` **no lo declara** y el backend no lo lee. Un date-picker cuyo valor se
 * descarta en silencio es peor que no tenerlo — la asignacion siempre queda con la fecha del server.
 * Drift reportado (contrato > paso de build).
 *
 * ⚠️ TAMPOCO HAY "MOTIVO DE CIERRE" ACA. El `POST` de conductor **no cierra la vigente** (a
 * diferencia del gemelo de dispositivo, D-S3-14): el cierre es un `DELETE` aparte, y su motivo lo fija
 * la propia operacion de cambio (`MOTIVO_CIERRE_POR_CAMBIO = 'reasignacion'`), no el usuario.
 */
export const asignarConductorVehiculoSchema = z.object({
  /** `''` = sin elegir. Id LOCAL del conductor (`conductores_flota.id`), NUNCA el `personaId`. */
  conductorFlotaId: z.string().min(1, 'validation.conductor_flota_id.required'),
  rol: z.enum(['principal', 'secundario']),
})

export type AsignarConductorVehiculoFormulario = z.infer<typeof asignarConductorVehiculoSchema>

export function valoresInicialesAsignarConductor(): AsignarConductorVehiculoFormulario {
  // `principal` como preseleccion del CONTROL, no como default del contrato (`rol` es requerido y
  // `dtos.ts` no elige por el usuario): asi el radio nace marcado en vez de vacio. La diferencia
  // importa — un vehiculo admite un solo principal a la vez (indice unico parcial), asi que elegir
  // `principal` sobre un vehiculo que ya lo tiene devuelve 409 `flota.vehiculo.ya_tiene_principal`.
  return { conductorFlotaId: '', rol: 'principal' }
}

export function aAsignarConductorVehiculoRequest(
  valores: AsignarConductorVehiculoFormulario,
): AsignarConductorRequest {
  return { conductorFlotaId: valores.conductorFlotaId, rol: valores.rol }
}
