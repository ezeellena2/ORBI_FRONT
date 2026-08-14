import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'

/**
 * Reactivacion del dispositivo dado de baja (`POST .../reactivar`, permiso
 * `flota.dispositivos.editar`).
 *
 * Es la contracara de `useBajaDispositivo` y la razon por la que la baja no se anuncia como
 * irreversible. Lo que NO hace es devolver el dispositivo a `instalado`: `dado_de_baja` es terminal
 * hacia adelante en la maquina de stock, y volver a un vehiculo requiere una asignacion nueva.
 *
 * ⚠️ **RESPONDE 204 SIN CUERPO** (`DispositivosController.Reactivar` → `NoContent()`). Este hook
 * tipaba la respuesta como `DispositivoDetalleDto` y sembraba `respuesta.data` en la cache del
 * detalle: con axios eso es el **string vacio**.
 *
 * ⚠️ **HOY NO TIENE SUPERFICIE ALCANZABLE, y no es olvido del front.** Sus 2 llamadores —el menu
 * "Mas acciones" de la ficha y el toggle "Dispositivo activo" del modal de edicion— necesitan un
 * `DispositivoDetalleDto` cargado, y `GET /dispositivos/{id}` responde **404** para un equipo dado
 * de baja (el detalle se lee sin `IgnoreQueryFilters()` y el query filter global es `x => x.Activo`).
 * O sea: se puede llegar al estado, no se puede salir por la UI. El conductor no tiene el problema
 * porque su "Reactivar" cuelga del kebab de la FILA del listado, que solo necesita el id. Es un
 * pendiente de LECTURA del backend (`ESTADO.md`), no andamio a borrar: el dia que el detalle alcance
 * la fila dada de baja, las 2 superficies funcionan sin tocar nada.
 */
export function useReactivarDispositivo(dispositivoId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, void>({
    mutationFn: async () => {
      await dispositivosService.reactivar(dispositivoId)
    },
    onSuccess: () => {
      // 204 sin cuerpo: solo se invalida el prefijo, que ya alcanza al listado y al detalle.
      void queryClient.invalidateQueries({ queryKey: flotaKeys.dispositivos() })
    },
  })
}
