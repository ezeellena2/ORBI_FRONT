import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { catalogosDispositivoService } from '@/services/flota/catalogos-dispositivo-service'

/**
 * Proveedores de SIM elegibles: globales + de la organizacion. Fuente del select "Proveedor de SIM".
 *
 * Mismo contrato que `useModelosDispositivo` (sin paginar, `staleTime` 5 min), con una sola
 * diferencia de shape: `fabricante` viaja SIEMPRE `null` porque la tabla no tiene esa columna. El
 * campo no se omite para que los dos catalogos compartan un unico DTO.
 */
export function useProveedoresSim() {
  return useQuery({
    queryKey: flotaKeys.proveedoresSim(),
    queryFn: async () => {
      const respuesta = await catalogosDispositivoService.listarProveedoresSim()
      return respuesta.data
    },
    staleTime: 300_000,
  })
}
