import { z } from 'zod'
import type { AsignarConductorRequest } from '@/services/contracts/flota'

/**
 * Schema del modal "Asignar vehiculo" **visto desde el conductor** (`f-05` §4 / `f-06` §9).
 *
 * ⚠️ EL ENDPOINT CUELGA DEL VEHICULO, NO DEL CONDUCTOR:
 * `POST /api/flota/vehiculos/{vehiculoFlotaId}/asignaciones/conductor`, permiso
 * **`flota.vehiculos.asignar-conductor`** (grupo VEHICULOS). Por eso el `vehiculoFlotaId` va en la
 * URL y NO en el body — `dtos.ts` declara solo `{conductorFlotaId, rol}`. Desde esta pantalla el
 * conductor ya esta elegido y lo que falta es el vehiculo, que es el sentido inverso al de `f-07`.
 *
 * Replica `AsignarConductorRequestValidator` con SUS `WithErrorCode`:
 * `validation.conductor_flota_id.required` y `validation.rol.invalid`.
 *
 * `rol` es **REQUERIDO y sin default adoptado** (`dtos.ts`): el contrato no elige por el usuario, y
 * la diferencia importa — un vehiculo admite **un solo principal a la vez** (indice unico parcial),
 * asi que elegir `principal` sobre un vehiculo que ya lo tiene devuelve 409
 * `flota.vehiculo.ya_tiene_principal`, y `secundario` no.
 */
export const asignarVehiculoConductorSchema = z.object({
  /** `''` = sin elegir. Id LOCAL del vehiculo de la flota (A-4), va a la URL. */
  vehiculoFlotaId: z.string().min(1, 'validation.vehiculo_flota_id.required'),
  rol: z.enum(['principal', 'secundario']),
})

export type AsignarVehiculoConductorFormulario = z.infer<typeof asignarVehiculoConductorSchema>

export function valoresInicialesAsignarVehiculo(): AsignarVehiculoConductorFormulario {
  // `principal` como preseleccion del control (no como default del contrato): es el caso normal, y
  // el radio se ve elegido en vez de arrancar sin ninguno marcado. El usuario lo puede cambiar antes
  // de confirmar y el request siempre lleva lo que quedo en el control.
  return { vehiculoFlotaId: '', rol: 'principal' }
}

export function aAsignarConductorRequest(
  conductorFlotaId: string,
  valores: AsignarVehiculoConductorFormulario,
): AsignarConductorRequest {
  return { conductorFlotaId, rol: valores.rol }
}
