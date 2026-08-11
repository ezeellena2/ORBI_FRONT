import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { catalogosDispositivoService } from '@/services/flota/catalogos-dispositivo-service'

/**
 * Modelos de GPS elegibles: los GLOBALES de la plataforma + los que agrego la organizacion.
 * Es la fuente del select "Modelo" del alta y la edicion de dispositivo.
 *
 * Sin paginar: el endpoint devuelve el array entero (`api.md` §Catalogos: "ninguno pagina").
 *
 * `staleTime` 5 min, igual que los catalogos canonicos: son datos de configuracion, no de operacion.
 * El alta de un modelo propio invalida esta key explicitamente, asi que la lista no se queda vieja
 * despues de agregar uno.
 *
 * ⚠️ UNA LISTA VACIA ES UNA RESPUESTA CORRECTA, no un error: la pantalla muestra su empty honesto y
 * `modeloId` es OPCIONAL en el alta desde D-S3-5, asi que el alta NO se bloquea por esto. Lo que
 * esta prohibido es hardcodear modelos "por las dudas" (DA-DD-02 / DA-DL-03).
 */
export function useModelosDispositivo() {
  return useQuery({
    queryKey: flotaKeys.modelosDispositivo(),
    queryFn: async () => {
      const respuesta = await catalogosDispositivoService.listarModelosDispositivo()
      return respuesta.data
    },
    staleTime: 300_000,
  })
}
