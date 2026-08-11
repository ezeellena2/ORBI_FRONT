import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'
import type { DispositivosPageQuery } from '@/services/contracts/flota'

/**
 * Listado paginado de dispositivos GPS del inventario de la organizacion activa.
 *
 * `staleTime` 30 s (`frontend.md` §5), igual que el listado de vehiculos: el inventario cambia por
 * CRUD y por cambios de stock, no en tiempo real.
 *
 * Partial-data (D-C1 a): si Telemetria no responde el backend igual devuelve 200 y `conexion` llega
 * `sin_dato`. No hay flag nuevo en el DTO ni estado de error — y en este slice la columna Conexion
 * ni siquiera se pinta (llega con slice-05), asi que la degradacion es invisible en esta pantalla.
 */
export function useDispositivos(query: DispositivosPageQuery = {}) {
  return useQuery({
    queryKey: flotaKeys.dispositivosListado(query),
    queryFn: async () => {
      const respuesta = await dispositivosService.listar(query)
      return respuesta.data
    },
    staleTime: 30_000,
    // Sin esto, al cambiar de pagina `data` pasa a undefined: la tabla vuelve a skeleton y el
    // control de paginacion se DESMONTA bajo el cursor del usuario.
    placeholderData: keepPreviousData,
  })
}
