import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'
import type { DispositivosPageQuery } from '@/services/contracts/flota'

/**
 * Listado paginado de dispositivos GPS del inventario de la organizacion activa.
 *
 * `staleTime` **60 s**. Este docblock decia "30 s (`frontend.md` §5), igual que el listado de
 * vehiculos" y citaba como fuente al documento que dice lo contrario: la tabla de `frontend.md` §5 da
 * un numero POR RECURSO — "Lista de vehiculos 30 s" y "**Conductores / dispositivos 60 s** (cambian
 * poco)" —, y `f-07` paso 1 repite el 60. El inventario cambia por CRUD y por stock, y las 2 cosas
 * invalidan el prefijo `['flota','dispositivos']` explicitamente.
 *
 * ⚠️ El `staleTime` NO gobierna la frescura de la CONEXION. `conexion` y `ultimaSenal` se componen
 * en cada request, pero este listado **no hace polling**: el badge es la foto del ultimo fetch. El
 * dato que se refresca solo es el del MAPA (`refetchInterval` 10-15 s, `frontend.md` §5), que es la
 * superficie contratada para mirar en vivo. Acortar este numero para "tener la conexion al dia"
 * seria convertir un inventario en un monitor, con un request por minuto por usuario.
 *
 * Partial-data (D-C1 a): si Telemetria no responde el backend igual devuelve 200, y `conexion` llega
 * `sin_dato` y `ultimaSenal` `null` en TODAS las filas. No hay flag nuevo en el DTO ni estado de
 * error: la ausencia se lee por los valores y la pantalla la declara con su aviso. Desde slice-05
 * `f-03` los dos campos traen dato REAL, asi que la degradacion ya se ve — antes la columna ni
 * siquiera se pintaba.
 *
 * ⚠️ El filtro `conexion` viaja DENTRO de `query`, asi que cambiarlo ya produce una key distinta y su
 * refetch. No hace falta —ni conviene— un segmento propio en la key: partiria el prefijo
 * `['flota','dispositivos']` que invalidan las mutations.
 */
export function useDispositivos(query: DispositivosPageQuery = {}) {
  return useQuery({
    queryKey: flotaKeys.dispositivosListado(query),
    queryFn: async () => {
      const respuesta = await dispositivosService.listar(query)
      return respuesta.data
    },
    staleTime: 60_000,
    // Sin esto, al cambiar de pagina `data` pasa a undefined: la tabla vuelve a skeleton y el
    // control de paginacion se DESMONTA bajo el cursor del usuario.
    placeholderData: keepPreviousData,
  })
}
