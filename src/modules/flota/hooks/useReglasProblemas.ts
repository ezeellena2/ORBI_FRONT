import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { reglasService } from '@/services/flota/reglas-service'
import type { ReglasPageQuery } from '@/services/contracts/flota'

/**
 * Listado paginado de reglas del motor.
 *
 * `staleTime` **60 s**. `frontend.md` §5 no da una fila para reglas; se usa el criterio de la fila
 * "cambian poco" (conductores / dispositivos), que es lo que una regla es: configuracion que se
 * toca por CRUD y no en tiempo real. Toda mutacion invalida `['flota','reglas']` explicitamente.
 *
 * ⚠️ **Sin filtros ni `sortBy`** (B-17), igual que la bandeja: `ReglasPageQuery` es `PageQuery`
 * pelado. El unico ORDER BY es nombre ASC, id ASC, y lo resuelve el server.
 *
 * ⚠️ **Hoy devuelve 0 filas en TODA organizacion, y el motivo no es el que el usuario supone**: las
 * 8 reglas seed de `motor-de-reglas.md` §7 **no se siembran** porque `FlotaActivacionSeedService` no
 * existe (deuda de slice-01) y la tabla de configuracion por-organizacion no la nombra ningun
 * documento (PENDIENTE #4). El empty-state "Aun no configuraste reglas" es literalmente cierto, pero
 * la organizacion tampoco eligio no tenerlas.
 *
 * ⚠️ 5 campos del DTO viajan en **0 / vacio siempre** y no son "no hay ninguno":
 * `vehiculosAlcanzadosCount`, `conductoresAlcanzadosCount`, `geozonasAlcanzadasCount`,
 * `destinatarios` y `canalesInternos` no tienen tabla puente (PENDIENTE #2) — **toda regla alcanza a
 * toda la organizacion**. `ultimasActivacionesCount` idem: no existe el vinculo problema -> regla.
 * La columna correspondiente va en `—`, no en `0`.
 */
export function useReglasProblemas(query: ReglasPageQuery = {}) {
  return useQuery({
    queryKey: flotaKeys.reglasProblemasListado(query),
    queryFn: async () => {
      const respuesta = await reglasService.listar(query)
      return respuesta.data
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}
