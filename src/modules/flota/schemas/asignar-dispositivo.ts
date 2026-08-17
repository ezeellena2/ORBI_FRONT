import { z } from 'zod'
import type {
  AsignarDispositivoRequest,
  DesasignarDispositivoRequest,
} from '@/services/contracts/flota'
import { MOTIVO_CIERRE_DEFECTO } from '../components/dispositivos/vocabulario-asignacion'

/**
 * Schemas de las 2 operaciones de asignacion vehiculo<->dispositivo.
 *
 * ── EL FORMULARIO TIENE UN SOLO CAMPO, Y ESO ES EL CONTRATO ───────────────────────────────────
 * `AsignarDispositivoRequest` del backend declara UNICAMENTE `dispositivoFlotaId`. Los otros 2
 * campos que `dtos.ts` describe **no se implementan** (D-S3-16) y por eso tampoco se piden acá:
 *  - `vehiculoFlotaId` ya es la URL. Mandarlo en el body crearia dos fuentes del mismo id, y
 *    `errores.md` no tiene ningun `code` para "el body dice otro vehiculo que la URL".
 *  - `fechaInicio` permitiria abrir un periodo en el futuro o antes del que se esta cerrando, y ese
 *    rechazo tampoco tiene `code`. No hay selector de fecha: el inicio es `now()`.
 *
 * El mensaje del campo requerido es `validation.dispositivo_flota_id.required`, que es EL MISMO
 * `WithErrorCode` de `AsignarDispositivoRequestValidator.cs`: la misma clave i18n resuelve el
 * rechazo local de Zod y el 400 del servidor, asi que el usuario lee el mismo texto venga de donde
 * venga.
 *
 * ── EL MOTIVO DE CIERRE NO ES TEXTO LIBRE ─────────────────────────────────────────────────────
 * Escribe `motivo_cierre`, que es FK al catalogo `motivos_cierre_asignacion_flota`. Un string suelto
 * revienta contra la FK; el backend lo ataja con
 * `DesasignarDispositivoRequestValidator` (400 `validation.motivo.invalid`) y acá el control es un
 * select cerrado. El enum de Zod es el mismo vocabulario del contrato.
 */

export const asignarDispositivoSchema = z.object({
  dispositivoFlotaId: z.string().min(1, 'validation.dispositivo_flota_id.required'),
})

export type AsignarDispositivoFormulario = z.infer<typeof asignarDispositivoSchema>

export const VALORES_INICIALES_ASIGNAR: AsignarDispositivoFormulario = {
  dispositivoFlotaId: '',
}

export function aAsignarDispositivoRequest(
  valores: AsignarDispositivoFormulario,
): AsignarDispositivoRequest {
  return { dispositivoFlotaId: valores.dispositivoFlotaId }
}

/**
 * El MISMO endpoint, visto desde el otro lado: en el inventario el GPS ya esta elegido y lo que falta
 * es el vehiculo (`f-07` §6 — kebab "Asignar a vehiculo").
 *
 * Por eso el unico campo del formulario es `vehiculoFlotaId`, que **va a la URL** y no al body: el
 * request que viaja sigue siendo `{ dispositivoFlotaId }`, armado con `aAsignarDispositivoRequest`.
 * No es un endpoint nuevo ni un permiso nuevo — es `flota.vehiculos.asignar-dispositivo`, del grupo
 * VEHICULOS, igual que desde la ficha del vehiculo.
 *
 * La clave del requerido es `validation.vehiculo_flota_id.required`, la misma que ya usa el modal de
 * conductor: es una eleccion de UI (el server no valida ese id como campo — lo recibe en la ruta),
 * asi que las dos pantallas dicen literalmente lo mismo, "Elegi un vehiculo de la lista".
 */
export const asignarVehiculoADispositivoSchema = z.object({
  vehiculoFlotaId: z.string().min(1, 'validation.vehiculo_flota_id.required'),
})

export type AsignarVehiculoADispositivoFormulario = z.infer<
  typeof asignarVehiculoADispositivoSchema
>

export const VALORES_INICIALES_ASIGNAR_VEHICULO: AsignarVehiculoADispositivoFormulario = {
  vehiculoFlotaId: '',
}

export const desasignarDispositivoSchema = z.object({
  motivo: z.enum(['reasignacion', 'reparacion', 'baja', 'otro']),
})

export type DesasignarDispositivoFormulario = z.infer<typeof desasignarDispositivoSchema>

export const VALORES_INICIALES_DESASIGNAR: DesasignarDispositivoFormulario = {
  motivo: MOTIVO_CIERRE_DEFECTO,
}

export function aDesasignarDispositivoRequest(
  valores: DesasignarDispositivoFormulario,
): DesasignarDispositivoRequest {
  return { motivo: valores.motivo }
}
