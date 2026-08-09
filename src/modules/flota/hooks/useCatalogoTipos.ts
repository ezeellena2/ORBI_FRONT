import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { catalogoService } from '@/services/flota/catalogo-service'

/**
 * Tipos de vehiculo del catalogo CANONICO. Lista entera, sin paginar (10 codigos sembrados por
 * `HasData`), a diferencia de marcas.
 *
 * El valor que viaja al backend es `codigo` en snake_case (`auto`, `camioneta`, ...). `nombre` es
 * solo la etiqueta base; la UI la traduce por i18n. Nunca se manda la etiqueta traducida.
 *
 * `staleTime` 5 min por el mismo motivo que marcas: catalogo global, no dato de la organizacion.
 */
export function useCatalogoTipos() {
  return useQuery({
    queryKey: flotaKeys.catalogoTipos(),
    queryFn: async () => {
      const respuesta = await catalogoService.listarTiposVehiculo()
      return respuesta.data
    },
    staleTime: 300_000,
  })
}
