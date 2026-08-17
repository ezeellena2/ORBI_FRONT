import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { reglasService } from '@/services/flota/reglas-service'
import type { ActualizarReglaProblemaRequest, ReglaProblemaDto } from '@/services/contracts/flota'

/**
 * Editar / activar / pausar / ajustar una regla — **un solo `PATCH` para las 4 acciones**
 * (DA-PR-08), permiso `flota.reglas.gestionar`. Devuelve 200 con la regla actualizada.
 *
 * ⚠️ **`activa: false` ES LA BAJA.** No existe `DELETE` en el contrato y no es un olvido: una regla
 * borrada dejaria problemas huerfanos de su origen. La fila **no desaparece** del listado al
 * pausarla, pasa a `Inactiva`; el copy no debe decir "eliminar".
 *
 * ⚠️ **El `tipo` no se edita**: el request ni siquiera lo declara, asi que mandarlo es un no-op
 * silencioso. Si el modal de edicion muestra el campo, va en solo lectura.
 *
 * ⚠️ **Ningun `PATCH` del modulo puede BORRAR un campo** (B-18): `System.Text.Json` no distingue
 * "propiedad ausente" de "propiedad en `null`", asi que el service **preserva**. Alcanza a
 * `webhookEndpointId`, que `dtos.ts` promete desvinculable con `null` explicito — y **no lo es**. Un
 * "quitar webhook" que responde 200 y no quita nada es un exito silencioso: si la pantalla lo
 * ofrece, tiene que avisar antes de guardar (mismo tratamiento que `AvisoCamposNoBorrables` en
 * dispositivos).
 *
 * `condicionJson` es **reemplazo completo** del objeto —no se mergea condicion por condicion— y se
 * revalida entera contra el DSL.
 */
export function useActualizarRegla(reglaId: string) {
  const queryClient = useQueryClient()

  return useMutation<ReglaProblemaDto, unknown, ActualizarReglaProblemaRequest>({
    mutationFn: async (data) => {
      const respuesta = await reglasService.actualizar(reglaId, data)
      return respuesta.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flotaKeys.reglasProblemas() })
    },
  })
}
