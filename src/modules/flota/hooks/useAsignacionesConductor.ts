import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'
import type { HistorialConductorQuery } from '@/services/contracts/flota'

/**
 * Historial de asignaciones a vehiculos de un conductor (`GET .../{id}/asignaciones`), paginado y
 * con ORDER BY estable (desde DESC, id DESC).
 *
 * Es el historial COMPLETO: activas + cerradas. `fechaFin === null` marca la vigente — una fila sin
 * fecha de fin NO es un dato incompleto.
 *
 * ⚠️ ES LA UNICA LECTURA QUE EXPONE EL `asignacionId` DE UNA ASIGNACION VIGENTE. Del lado del
 * vehiculo no hay forma de descubrirlo: `GET /vehiculos/{id}/asignaciones` no esta implementado
 * (B-19) y `VehiculoDetalleDto.conductoresAsignados` viene vacio siempre. Quien tenga que
 * DESASIGNAR desde la ficha del vehiculo sin haber asignado en esta sesion, lo saca de aca.
 *
 * `patente` puede venir `null` (proyeccion canonica no vigente): la celda usa `patente ?? id`,
 * nunca la interpolacion cruda.
 *
 * `query` tiene que ser estable POR VALOR entre renders (regla de `query-keys.ts`).
 */
export function useAsignacionesConductor(
  conductorId: string | undefined,
  query: HistorialConductorQuery = {},
) {
  const id = conductorId ?? ''

  return useQuery({
    queryKey: flotaKeys.conductorAsignaciones(id, query),
    queryFn: async () => {
      const respuesta = await conductoresService.listarAsignaciones(id, query)
      return respuesta.data
    },
    enabled: id.length > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
