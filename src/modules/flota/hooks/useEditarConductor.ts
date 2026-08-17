import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'
import type { ActualizarConductorRequest, ConductorDetalleDto } from '@/services/contracts/flota'

/**
 * Edicion de datos OPERATIVOS del conductor (`PATCH .../{id}`, permiso `flota.conductores.editar`).
 *
 * ⚠️ La identidad de la Persona (nombre, DNI, email, telefono) es proyeccion canonica READ-ONLY
 * (P-A) y ni siquiera esta en el request: el modal la muestra DESHABILITADA con la leyenda de que se
 * edita en la superficie canonica. El mockup la dibuja editable y esta mal.
 *
 * ⚠️ VACIAR UN CAMPO ES HOY UN NO-OP CON 200 OK: `System.Text.Json` no distingue "ausente" de
 * "null", asi que el service preserva el valor actual (B-18, abierta). El formulario avisa antes de
 * guardar en vez de dejar creer que se borro — ver `AvisoCamposNoBorrables`.
 *
 * No toca el estado operativo (tiene su propia maquina) ni `activo` (baja / reactivar).
 * Publica `flota.conductor-operativo-actualizado.v1`.
 */
export function useEditarConductor(conductorId: string) {
  const queryClient = useQueryClient()

  return useMutation<ConductorDetalleDto, unknown, ActualizarConductorRequest>({
    mutationFn: async (data) => {
      const respuesta = await conductoresService.actualizar(conductorId, data)
      return respuesta.data
    },
    onSuccess: (detalle) => {
      queryClient.setQueryData(flotaKeys.conductorDetalle(conductorId), detalle)
      void queryClient.invalidateQueries({ queryKey: flotaKeys.conductores() })
    },
  })
}
