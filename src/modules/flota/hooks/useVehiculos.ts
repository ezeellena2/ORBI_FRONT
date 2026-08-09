import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'
import type { VehiculosPageQuery } from '@/services/contracts/flota'

/**
 * Listado paginado de vehiculos de la organizacion activa.
 *
 * `staleTime` 30 s (`frontend.md` §5): el listado cambia por CRUD, no en tiempo real.
 *
 * Partial-data: si Telemetria no responde, el backend igual devuelve 200 y los campos tecnicos
 * llegan en `null` (`estado: 'sin_dato'`, `ultimaSenal: null`). No hay flag nuevo en el DTO ni
 * estado de error: la pantalla lee la ausencia por los `null` y sigue mostrando todo lo demas.
 */
export function useVehiculos(query: VehiculosPageQuery = {}) {
  return useQuery({
    queryKey: flotaKeys.vehiculosListado(query),
    queryFn: async () => {
      const respuesta = await vehiculosService.listar(query)
      return respuesta.data
    },
    staleTime: 30_000,
    // Sin esto, al cambiar de pagina `data` pasa a undefined: la tabla vuelve a skeleton y el
    // control de paginacion se DESMONTA bajo el cursor del usuario. Con keepPreviousData la
    // pagina anterior queda visible (atenuada) hasta que llega la nueva.
    placeholderData: keepPreviousData,
  })
}
