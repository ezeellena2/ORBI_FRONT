import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorCambioDeProblema } from '../query-keys'
import { problemasService } from '@/services/flota/problemas-service'
import type { AsignarProblemaRequest } from '@/services/contracts/flota'

/**
 * Asignar o reasignar el responsable de un problema — `POST .../asignar`, permiso
 * `flota.problemas.asignar` (es la unica accion del grupo que `analista` tiene y que `gestionar` no
 * le da).
 *
 * ⚠️ **RESPONDE 204 SIN CUERPO.** No hay DTO con el que sembrar la cache del detalle: con axios el
 * cuerpo de un 204 es el **string vacio**, y sembrarlo dejaria `''` donde va el DTO (es el defecto
 * D-S5F-1, cometido con 3 mutaciones de dispositivo). Se invalida el prefijo y se refetchea.
 *
 * ⚠️ Sobre un problema **terminal** el backend responde **409 `flota.problema.transicion_invalida`**
 * — el mismo code que la transicion bloqueada, porque el catalogo no tiene uno para "accion sobre
 * problema cerrado" y no se invento. La pantalla lo distingue por `args.estadoActual` con
 * `tratamientoDeErrorCentro`, no por status.
 *
 * ⚠️ El `comentario` opcional **no queda como comentario del timeline** (PENDIENTE #17): viaja al
 * `detalle` del hecho `asignado`. El label del campo no debe prometer el hilo.
 *
 * ⚠️ **DA-PC-07 sigue abierta**: no existe endpoint de catalogo de usuarios asignables, asi que el
 * selector de responsable no tiene de donde alimentarse y el modal no puede enviarse todavia.
 * Listar usuarios desde otra superficie esta prohibido.
 */
export function useAsignarProblema(problemaId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, AsignarProblemaRequest>({
    mutationFn: async (data) => {
      await problemasService.asignar(problemaId, data)
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorCambioDeProblema()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
