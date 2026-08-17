import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { catalogoService } from '@/services/flota/catalogo-service'

/**
 * Modelos de una marca del catalogo CANONICO (paso 2 de la cascada).
 *
 * Es el ultimo nivel que Flota consume: su `id` es el ANCLA INTERMEDIA que viaja como `modeloId` en
 * el alta. Los pasos 3 (anios) y 4 (versiones) NO se piden — una flota no conoce el trim de sus
 * unidades, y ese nivel es de los verticales comerciales.
 *
 * `enabled` por marca: sin marca elegida NO se emite request. Es la diferencia entre "todavia no
 * elegiste marca" y "esta marca no tiene modelos", que la UI tiene que poder distinguir.
 *
 * OJO — igual que marcas, la tabla `plataforma_canonica.modelos` esta VACIA hasta que se cargue el
 * dataset (DA-CAT-02). Una respuesta con `items: []` es CORRECTA: significa que el catalogo no
 * cubre esa marca todavia, y la UI cae al texto libre en vez de trabar el alta.
 */
export function useCatalogoModelos(marcaId: string | undefined, q?: string) {
  return useQuery({
    queryKey: flotaKeys.catalogoModelos(marcaId, q),
    queryFn: async () => {
      const respuesta = await catalogoService.listarModelos(marcaId!, q ? { q } : {})
      return respuesta.data
    },
    enabled: marcaId !== undefined && marcaId.length > 0,
    staleTime: 300_000,
  })
}
