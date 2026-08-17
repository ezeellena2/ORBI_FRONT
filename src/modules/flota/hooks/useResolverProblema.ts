import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorCambioDeProblema } from '../query-keys'
import { problemasService } from '@/services/flota/problemas-service'
import type { ResolverProblemaRequest } from '@/services/contracts/flota'

/**
 * Cierre **TERMINAL** del problema — `POST .../resolver`, permiso `flota.problemas.resolver`.
 * **204 SIN CUERPO**.
 *
 * `resultado` solo admite `resuelto` | `descartado` (los 2 terminales del catalogo de 7); fuera de
 * esos dos, 400 del Validator. **Evidencia vacia da 400**: es criterio de aceptacion del slice, asi
 * que el textarea es obligatorio del lado del cliente tambien.
 *
 * ⚠️ **Es irreversible y no hay endpoint de reapertura**: el catalogo de transiciones no existe y
 * `POST /problemas/{id}/estado` no esta enrutado. Despues de esto, asignar y silenciar sobre el
 * mismo problema responden 409. El copy de la confirmacion **no debe decir "se puede deshacer"**.
 *
 * ⚠️ `crearEventoCierreIntegracion` **se acepta y no dispara nada** (DA-IN-08 abierta): emitir el
 * cierre al plano publico exige el mapeo evento-interno <-> evento-publico, que no existe. Si el
 * modal ofrece el toggle, tiene que decir que hoy no envia nada — mandarlo en `true` y callarlo es
 * prometerle al usuario una integracion que no ocurre.
 *
 * ⚠️ Despues del exito, el ticket sigue siendo legible (el detalle no responde 404: no es una baja
 * logica), pero sus `accionesDisponibles` se reducen a `['ver_vehiculo','ver_mapa']`. La pantalla no
 * necesita sacar al usuario de la URL — a diferencia de las bajas de dispositivo y conductor.
 */
export function useResolverProblema(problemaId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, ResolverProblemaRequest>({
    mutationFn: async (data) => {
      await problemasService.resolver(problemaId, data)
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorCambioDeProblema()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
