import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DETECCION_DE_SENALES_CONECTADA } from '../vocabulario-senales'
import { flotaKeys } from '../query-keys'
import { senalesService } from '@/services/flota/senales-service'
import type { AlertasPageQuery } from '@/services/contracts/flota'

/**
 * Senales operativas (las "alertas" del contrato). Permiso **`flota.vehiculos.leer`** — no existe
 * `flota.alertas.*` y no se inventa: leer senales es contexto del vehiculo.
 *
 * `staleTime` **15 s** (`frontend.md` §5, fila "Senales": badges relativamente frescos).
 *
 * ══ ⚠️ ESTE HOOK DEVUELVE 0 ITEMS SIEMPRE, Y NO ES UN BUG (GATE 2 / B-38) ═══════════════════════
 * **No hay ni un escritor de alertas en todo el backend.** El catalogo `tipos_alerta_flota` se creo
 * **vacio a proposito** —el contrato publica dos catalogos distintos de `tipo_alerta` y elegir uno
 * es acto del PO— y la FK rechaza toda insercion.
 *
 * ⇒ **El vacio de esta superficie NO puede decir "no hay alertas" ni "esta todo bien"**: seria
 * mentira, y es la mentira mas cara posible en una pantalla de deteccion. Lo dice
 * `flota:senales.aviso.deteccion_sin_conectar` (via `AvisoDeSenales`), que es el copy que
 * efectivamente se renderiza — habia una segunda copia del mismo hecho en `centro.senales.*`,
 * huerfana, y se borro en el cierre de slice-06: dos copias de una misma verdad es como empieza el
 * drift.
 *
 * ⚠️ **La consulta NO se emite mientras el interruptor este apagado** (`enabled`). Ninguno de los 3
 * lectores del indice mira la respuesta con `deteccionConectada = false` —los 3 cortan antes—, asi
 * que emitirla es un request por pantalla cuyo resultado no puede cambiar un solo pixel. Es el
 * mismo criterio de **D-S5F-3** con el tab Historial, mas suave (aca el 200 no ensucia la telemetria
 * de errores). El dia que GATE 2 cierre, el mismo flag la reenciende.
 *
 * ⚠️ **No hay pantalla propia de senales y no se agrega un item "Alertas" al menu** (B-20): las
 * alertas son senales, y lo accionable vive en el Centro de Problemas. Este hook alimenta
 * superficies EMBEBIDAS (`f-12`), no una ruta.
 *
 * ⚠️ Sin filtros: `api.md` §Alertas no declara ninguno — ni `estado`, ni `severidad`, ni `desdeUtc`.
 */
export function useSenales(query: AlertasPageQuery = {}) {
  return useQuery({
    queryKey: flotaKeys.alertasListado(query),
    queryFn: async () => {
      const respuesta = await senalesService.listar(query)
      return respuesta.data
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    enabled: DETECCION_DE_SENALES_CONECTADA,
  })
}
