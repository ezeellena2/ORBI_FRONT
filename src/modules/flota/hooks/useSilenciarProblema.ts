import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorCambioDeProblema } from '../query-keys'
import { problemasService } from '@/services/flota/problemas-service'
import type { SilenciarProblemaRequest } from '@/services/contracts/flota'

/**
 * Silenciar un problema con motivo y ventana — `POST .../silenciar`, permiso
 * `flota.problemas.silenciar`. **204 SIN CUERPO** (ver `useAsignarProblema` para el porque de no
 * sembrar la cache).
 *
 * ⚠️ **Los 4 campos del body son obligatorios.** Faltar uno da 400 `ValidationProblemDetails` con
 * TODOS los errores y el service ni se ejecuta; se mapean a los campos del formulario.
 *
 * ══ LO QUE EL COPY TIENE QUE DECIR, PORQUE ES CONTRAINTUITIVO ═══════════════════════════════════
 *  - El silencio **arranca ahora**: el request solo trae el `hasta`, no un desde.
 *  - **No borra senales y no detiene la deteccion**: los problemas se siguen agrupando.
 *  - **NO pausa el reloj de SLA** (`motor-de-reglas.md` §4.2). Un problema silenciado puede vencer
 *    igual, y si la pantalla no lo dice el operador cree que compro tiempo.
 *
 * ⚠️ Los 2 toggles (`silenciarNotificaciones` / `silenciarWebhooks`) **se persisten tal cual vienen**
 * y ningun documento fija si el silencio alcanza a los webhooks externos ni quien puede silenciar un
 * problema critico. El backend no les puso default ni gate inventado; la pantalla tampoco debe
 * presuponer uno.
 */
export function useSilenciarProblema(problemaId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, SilenciarProblemaRequest>({
    mutationFn: async (data) => {
      await problemasService.silenciar(problemaId, data)
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorCambioDeProblema()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
