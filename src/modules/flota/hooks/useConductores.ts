import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'
import type { ConductoresPageQuery } from '@/services/contracts/flota'

/**
 * Listado paginado de conductores operativos de la organizacion activa.
 *
 * `staleTime` 30 s, igual que los otros dos listados del modulo: cambia por CRUD y por asignaciones,
 * no en tiempo real.
 *
 * ⚠️ PARTIAL-DATA ESTRUCTURAL, no borde: `nombreCompleto`, `dni`, `telefonoPrincipal` y
 * `licencia.categoria` pueden venir (o vienen siempre) `null` dentro de un 200 exitoso — el
 * `find-or-create` del Canonico gatea la PII y la categoria no tiene columna (B-21). NO es un estado
 * de error y NO tiene rama: la tabla pinta su fallback por celda.
 *
 * `query` tiene que ser estable POR VALOR entre renders (regla de `query-keys.ts`): un objeto
 * literal recreado en cada render genera una query nueva por render.
 */
export function useConductores(query: ConductoresPageQuery = {}) {
  return useQuery({
    queryKey: flotaKeys.conductoresListado(query),
    queryFn: async () => {
      const respuesta = await conductoresService.listar(query)
      return respuesta.data
    },
    staleTime: 30_000,
    // Sin esto, al cambiar de pagina `data` pasa a undefined: la tabla vuelve a skeleton y el
    // control de paginacion se DESMONTA bajo el cursor del usuario.
    placeholderData: keepPreviousData,
  })
}
