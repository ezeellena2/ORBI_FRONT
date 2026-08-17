import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'

/**
 * Baja del dispositivo — `POST .../baja`, NO `DELETE` (el `DELETE` es hard-delete y no tiene
 * superficie en esta pantalla).
 *
 * Es una baja LOGICA Y COHERENTE: `activo = false` + `estado_stock = 'dado_de_baja'` en la misma
 * transaccion (DA-DL-10). Y es REVERSIBLE con `POST .../reactivar` (DA-DD-13), asi que el copy de
 * la confirmacion NO dice "no se puede deshacer".
 *
 * Con asignacion activa el backend BLOQUEA con 409 `flota.dispositivo.baja_con_asignacion_activa`:
 * primero hay que desasociar el dispositivo del vehiculo.
 *
 * ⚠️ **RESPONDE 204 SIN CUERPO.** El docblock anterior afirmaba lo contrario —"este endpoint
 * devuelve el detalle actualizado en vez de 204"— y por eso el hook hacia
 * `setQueryData(dispositivoDetalle(id), respuesta.data)`: con axios, el cuerpo de un 204 es el
 * **string vacio**, asi que lo que quedaba sembrado en la cache del detalle era `''`. Verificado
 * contra `DispositivosController.DarDeBaja` → `NoContent()`.
 *
 * ⚠️ **Y despues de la baja el detalle NO SE PUEDE VOLVER A LEER**: `GET /dispositivos/{id}` sale
 * por `ObtenerConCatalogos`, que no levanta el query filter global (`x => x.Activo`), asi que
 * responde **404**. Por eso acá solo se invalida el prefijo —que ya alcanza al listado y al
 * detalle— y la PANTALLA de detalle es la que tiene que sacar al usuario de una URL que a partir de
 * ahora es 404 (mismo criterio que D-S4F-7 con el hard-delete del conductor).
 */
export function useBajaDispositivo(dispositivoId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, void>({
    mutationFn: async () => {
      await dispositivosService.darDeBaja(dispositivoId)
    },
    onSuccess: () => {
      // 204 sin cuerpo: no hay detalle con el que sembrar la cache, solo se invalida el prefijo.
      // `flotaKeys.dispositivos()` es `['flota','dispositivos']` y ya cubre `dispositivoDetalle(id)`
      // y su historial de stock, asi que no hace falta enumerarlos.
      void queryClient.invalidateQueries({ queryKey: flotaKeys.dispositivos() })
    },
  })
}
