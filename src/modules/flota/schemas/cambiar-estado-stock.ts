import { z } from 'zod'
import type { CambiarEstadoStockRequest } from '@/services/contracts/flota'

/**
 * Schema del modal "Cambiar estado de stock".
 *
 * El enum es el vocabulario CERRADO del contrato menos DOS destinos, exactamente igual que
 * `CambiarEstadoStockRequest.estadoNuevo`. Los dos se excluyen por razones distintas:
 *  - `instalado`: no es alcanzable por este request, se logra asignando el dispositivo a un vehiculo
 *    (DA-DL-05).
 *  - `dado_de_baja`: **D-S3-9, cambio del contrato**. Antes SI era un destino valido y este enum lo
 *    ofrecia. Se saco porque producia dos permisos distintos con el mismo efecto: este endpoint esta
 *    gateado por `flota.dispositivos.gestionar-stock` (que supervisor tiene) y la baja por
 *    `flota.dispositivos.eliminar` (que supervisor NO tiene). Hoy el unico camino a la baja es
 *    `POST .../baja`, y pedirla por aca devuelve 409
 *    `flota.dispositivo.transicion_stock_invalida`.
 *
 * Que el tipo los excluya es lo que impide que alguien los agregue al select "porque faltan".
 *
 * Que destinos se OFRECEN desde el estado actual lo decide `destinosDeStock` (la maquina de estados
 * de `datos.md` §3.3). Esto es un enum de forma, no la regla de negocio: la regla la valida el
 * backend.
 *
 * `motivo` es opcional en el contrato y queda opcional aca. Su unico limite es el que declara
 * `CambiarEstadoStockRequestValidator` (500), con el MISMO `WithErrorCode`: el string
 * `validation.motivo.max_length` es a la vez la clave i18n del error local de Zod y la del 400 del
 * backend. No se inventa ningun otro tope.
 */
export const cambiarEstadoStockSchema = z.object({
  estadoNuevo: z.enum(['en_stock', 'en_reparacion']),
  motivo: z.string().trim().max(500, 'validation.motivo.max_length'),
})

export type CambiarEstadoStockFormulario = z.infer<typeof cambiarEstadoStockSchema>

export function aCambiarEstadoStockRequest(
  valores: CambiarEstadoStockFormulario,
): CambiarEstadoStockRequest {
  const motivo = valores.motivo.trim()

  return {
    estadoNuevo: valores.estadoNuevo,
    motivo: motivo.length > 0 ? motivo : undefined,
  }
}
