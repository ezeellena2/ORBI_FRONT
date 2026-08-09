import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { catalogoService } from '@/services/flota/catalogo-service'

/**
 * Marcas del catalogo CANONICO (paso 1 de la cascada), con busqueda por texto.
 *
 * OJO — la tabla `plataforma_canonica.marcas` esta VACIA hasta que se decida la fuente de datos
 * (DA-CAT-02). Una respuesta con `items: []` es CORRECTA, no un error: el select muestra su empty
 * honesto. Portar las opciones hardcodeadas del mockup esta prohibido.
 *
 * `staleTime` 5 min: es un catalogo global de plataforma, sin tenant, que cambia cuando corre el
 * importador — no entre dos pantallas de un mismo usuario.
 */
export function useCatalogoMarcas(q?: string) {
  return useQuery({
    queryKey: flotaKeys.catalogoMarcas(q),
    queryFn: async () => {
      const respuesta = await catalogoService.listarMarcas(q ? { q } : {})
      return respuesta.data
    },
    staleTime: 300_000,
  })
}
