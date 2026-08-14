import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'
import type { VehiculosPageQuery } from '@/services/contracts/flota'

/**
 * Cuantos vehiculos tiene la flota — el denominador que el mapa NO puede sacar de su propio endpoint.
 *
 * ══ POR QUE HACE FALTA UN SEGUNDO REQUEST ══════════════════════════════════════════════════════
 * `GET /api/flota/mapa/vehiculos` devuelve **solo los vehiculos con posicion conocida**: los demas
 * salen del array (jamas se dibujan en `0,0`). Con eso solo, la pantalla puede decir cuantos pines
 * hay y **no** cuantos faltan — y un mapa con 3 pines sobre una flota de 20, sin explicacion, se lee
 * como "perdi 17 vehiculos". Este hook aporta el unico numero que falta.
 *
 * ══ POR QUE LA RESTA ES EXACTA Y NO UNA ESTIMACION ═════════════════════════════════════════════
 * Los dos endpoints recorren **el mismo universo**: `MapaEnVivoService.ObtenerMapa` llama a
 * `ListarSinPaginar(orgId, new VehiculosPageQuery())`, y ese record trae `SoloActivos = true` por
 * default — el mismo default del listado. Sin filtros de ningun lado, `totalItems` es exactamente la
 * poblacion de la que el mapa dibuja un subconjunto.
 *
 * ══ POR QUE `pageSize: 1` ══════════════════════════════════════════════════════════════════════
 * De esta respuesta solo se usa `pagination.totalItems`. Traer 100 filas para leer un entero haria
 * que el backend componga Telemetria para 100 vehiculos en cada refresco de la pantalla. Con 1 fila
 * el conteo es igual de exacto —`totalItems` no depende de la pagina— y el intento es inequivoco para
 * el que lea esto despues.
 *
 * ⚠️ Por eso mismo **`items` de esta query no se usa para nada**: es 1 vehiculo cualquiera, no una
 * muestra. Quien quiera listar los vehiculos sin ubicacion necesita el listado de verdad
 * (`/app/flota/vehiculos`), que es adonde apunta el CTA del aviso.
 *
 * ══ POR QUE SE REFRESCA, AUNQUE NO SEA UN DATO EN VIVO ═════════════════════════════════════════
 * `staleTime: 60 s` marca el dato como viejo pero **no dispara nada**, y el default global del repo
 * tiene `refetchOnWindowFocus: false` (`AppProviders`). Con eso, este conteo se pedia **una sola vez,
 * al montar**, y no volvia a pedirse en toda la sesion: se abria el mapa con 20 vehiculos, se daban
 * de alta 5 en otra pestaña, y la pantalla seguia diciendo "8 de 20" cuando la verdad era 13 de 25.
 * El numero era exacto en el instante del montaje y derivaba toda la sesion.
 *
 * La cadencia es **larga a proposito** (5 min, dos ordenes de magnitud por encima del polling del
 * mapa): el total cambia por altas y bajas, no en tiempo real. Y `refetchIntervalInBackground: false`
 * por el mismo motivo que el mapa — una pestaña de fondo no pide nada. Comparte el prefijo
 * `['flota','vehiculos']`, asi que cualquier mutation del recurso ya lo invalida ademas.
 */
const REFRESCO_DEL_CONTEO_MS = 300_000

/**
 * Constante de MODULO, no un objeto literal en el cuerpo del hook.
 *
 * React Query hashea las keys estructuralmente, asi que un objeto nuevo por render igual produce la
 * misma key — pero la regla del repo (`query-keys.ts`) es que todo lo que entra en una key sea
 * estable POR VALOR, y ya costo un bucle infinito una vez. Una constante de modulo lo garantiza sin
 * `useMemo` (prohibido en este repo).
 */
const CONSULTA_DE_CONTEO: VehiculosPageQuery = { page: 1, pageSize: 1, soloActivos: true }

export function useTotalDeLaFlota() {
  return useQuery({
    queryKey: flotaKeys.vehiculosListado(CONSULTA_DE_CONTEO),
    queryFn: async () => {
      const respuesta = await vehiculosService.listar(CONSULTA_DE_CONTEO)
      return respuesta.data
    },
    staleTime: 60_000,
    refetchInterval: REFRESCO_DEL_CONTEO_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}
