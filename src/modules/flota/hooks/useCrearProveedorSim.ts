import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { catalogosDispositivoService } from '@/services/flota/catalogos-dispositivo-service'
import type {
  CatalogoGrowableItemDto,
  CrearProveedorSimRequest,
} from '@/services/contracts/flota'

/**
 * Alta de un proveedor de SIM propio de la organizacion. Gemelo de `useCrearModeloDispositivo`:
 * mismo permiso (`flota.dispositivos.crear`), mismo 409 (`flota.catalogo.nombre_duplicado`, con
 * `catalogo: 'proveedores_sim_flota'` en los `args`) y misma invalidacion acotada al catalogo.
 *
 * La unica diferencia es el request: NO lleva `fabricante` porque la tabla no tiene esa columna.
 *
 * Tambien siembra la fila nueva en la cache antes de invalidar, por el mismo motivo: quien la acaba
 * de agregar la elige de inmediato, y sin la siembra el select se ve vacio hasta que vuelve el
 * refetch.
 */
export function useCrearProveedorSim() {
  const queryClient = useQueryClient()

  return useMutation<CatalogoGrowableItemDto, unknown, CrearProveedorSimRequest>({
    mutationFn: async (data) => {
      const respuesta = await catalogosDispositivoService.crearProveedorSim(data)
      return respuesta.data
    },
    onSuccess: (item) => {
      queryClient.setQueryData<CatalogoGrowableItemDto[]>(
        flotaKeys.proveedoresSim(),
        (actual) => (actual === undefined ? [item] : [...actual, item]),
      )
      void queryClient.invalidateQueries({ queryKey: flotaKeys.proveedoresSim() })
    },
  })
}
