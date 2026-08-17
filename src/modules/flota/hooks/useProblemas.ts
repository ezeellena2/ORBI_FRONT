import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { problemasService } from '@/services/flota/problemas-service'
import type { ProblemasPageQuery } from '@/services/contracts/flota'

/**
 * Bandeja paginada del Centro de Problemas.
 *
 * ⚠️ **Es el UNICO origen de datos de las 3 vistas de LISTA del Centro** (sala, timeline y kanban):
 * no existe endpoint de timeline ni de tablero, asi que las 3 agrupan y posicionan **sobre esta
 * misma respuesta**. Cualquier conteo que muestren es de **la pagina cargada** y tienen que
 * rotularlo como tal.
 *
 * El **ticket** (`?ticket=`) es la excepcion: tiene su propio `GET /problemas/{id}` y NO consume
 * este hook. Por eso tampoco puede mostrar "otros problemas de este vehiculo" — ese derivado sale de
 * la pagina de la bandeja, que el ticket no carga.
 *
 * `staleTime` **15 s** (`frontend.md` §5, fila "Problemas": bandeja accionable, refleja estado y SLA
 * pronto). Sin `refetchInterval`: no es una superficie de monitoreo en vivo — la unica que hace
 * polling en el modulo es el mapa, y el polling ahi lo fija el contrato.
 *
 * ⚠️ **La query NO lleva filtros ni `sortBy`** (B-17), y no es un recorte del hook: el server hereda
 * `PageQuery` pelado. Mandar parametros de mas no da error — el binder los descarta y la respuesta
 * viene sin filtrar, que es peor que no ofrecer el filtro. El orden (prioridad DESC, deteccion DESC,
 * id DESC) lo resuelve el backend y **el front no reordena** (A-15).
 *
 * ⚠️ **Una bandeja vacia hoy NO significa "tu flota esta tranquila".** El motor no tiene reglas
 * sembradas en ninguna organizacion (`FlotaActivacionSeedService` no existe y la tabla de
 * configuracion por-organizacion no la nombra ningun documento, PENDIENTE #4), asi que **nadie crea
 * problemas todavia**. El empty-state tiene que distinguir "no hay casos" de "la deteccion no esta
 * conectada"; si no, la pantalla afirma que la flota esta bien sin haberla mirado.
 */
export function useProblemas(query: ProblemasPageQuery = {}) {
  return useQuery({
    queryKey: flotaKeys.problemasListado(query),
    queryFn: async () => {
      const respuesta = await problemasService.listar(query)
      return respuesta.data
    },
    staleTime: 15_000,
    // Sin esto, al cambiar de pagina `data` pasa a undefined: la cola vuelve a skeleton y el control
    // de paginacion se DESMONTA bajo el cursor del usuario.
    placeholderData: keepPreviousData,
  })
}
