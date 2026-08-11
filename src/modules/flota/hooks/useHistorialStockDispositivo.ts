import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'
import type { HistorialStockQuery } from '@/services/contracts/flota'

/**
 * Historial de transiciones de stock de un dispositivo (`GET .../historial-stock`), paginado y con
 * ORDER BY estable (fecha DESC, id).
 *
 * ⚠️ ESTE ENDPOINT ESTA IMPLEMENTADO. El "no hay tabla en el contrato de datos" que la ficha de
 * detalle todavia dibuja en su tab "Stock" quedo viejo: la tabla es
 * `transiciones_stock_dispositivo_flota` y existe desde la migracion
 * `Agregado_DispositivoGps_Y_Asignacion`.
 *
 * La PRIMERA fila del historial es siempre la transicion INICIAL del alta, con
 * `estadoAnterior === null`. No es ruido: es de donde el detalle repone `fechaAltaOperativa`
 * (D-S3-26). Una lista con un solo item NO significa "nunca cambio de estado por error".
 *
 * `query` tiene que ser estable POR VALOR entre renders (ver la regla en `query-keys.ts`): un objeto
 * literal recreado en cada render genera una query nueva por render.
 */
export function useHistorialStockDispositivo(
  dispositivoId: string | undefined,
  query: HistorialStockQuery = {},
) {
  const id = dispositivoId ?? ''

  return useQuery({
    queryKey: flotaKeys.dispositivoHistorialStock(id, query),
    queryFn: async () => {
      const respuesta = await dispositivosService.listarHistorialStock(id, query)
      return respuesta.data
    },
    enabled: id.length > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
