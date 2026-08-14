import { appConfig } from '@/config/env'
import { httpClient } from '@/services/http/http-client'
import type { MapaResponseDto, VehiculoEnVivoDto } from '@/services/contracts/flota'

/**
 * Cliente HTTP de la seccion §Mapa en vivo de `Flota.Api` (`MapaController`, slice-05 `f-04`). Un
 * metodo por endpoint del contrato: los 2 que existen, ni uno mas.
 *
 * ══ POR QUE ESTE ARCHIVO EXISTE, Y NO UNA LLAMADA A TELEMETRIA ══════════════════════════════════
 * El browser NUNCA llama a Traccar, a Telemetria ni a RabbitMQ — es invariante del `CLAUDE.md` raiz
 * y de `fronteras/telemetria.md` §1, no una preferencia. El mapa sale de `Flota.Api`, que compone
 * del lado del servidor: si el front hablara con Telemetria directo, el tenant y los permisos
 * quedarian del lado del cliente.
 *
 * ── LO QUE ESTE SERVICIO NO EXPONE, Y POR QUE ──────────────────────────────────────────────────
 *  - **Query params** (`bbox`, `estado`, `conductorId`): el controller NO ACEPTA NINGUNO — `api.md`
 *    §Mapa en vivo no los declara (PENDIENTE **P6**, decide el PO). Un param que el binder no
 *    conoce se DESCARTA sin error, o sea que mandarlo devuelve 200 con la flota entera y el usuario
 *    cree que filtro. Filtrar el mapa es filtrado LOCAL sobre lo que ya llego.
 *  - **SSE / WebSocket**: fase 2 por contrato. El refresco es **polling** (10-15 s recomendado por
 *    `api.md`); la cadencia la decide la pantalla, no este archivo.
 *  - **Recorridos / historico / viajes**: sin fuente (**B-9**). Esos endpoints responden 500
 *    `flota.telemetria.no_disponible` y NO se piden.
 *  - **Geozonas sobre el mapa**: DIFERIDO (DA-08).
 *
 * ⚠️ Las 2 superficies son **partial-data (convencion 8a), no degradadas**: Telemetria solo
 * *enriquece* una respuesta propia de Flota, asi que responden **200** con los campos tecnicos en
 * `null` — nunca 500 por Telemetria caida. La lista de superficies que dan 500 es cerrada y ninguna
 * de estas dos esta en ella.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

const BASE = '/api/flota/mapa'

const configFlota = { baseURL: appConfig.flotaApiBaseUrl } as const

export const mapaService = {
  /**
   * GET /api/flota/mapa/vehiculos -> 200 `MapaResponseDto`. Permiso `flota.vehiculos.leer`.
   *
   * NO pagina (el contrato no lo declara `PagedResult<T>`) y NO acepta parametros. El backend lo
   * resuelve con 2 llamadas por-organizacion fijas, no N por vehiculo.
   *
   * ⚠️ Un vehiculo **sin coordenadas no viene en `items`**: sale del array en vez de dibujarse en
   * `0,0`, que es un punto real en el golfo de Guinea. O sea que `items.length` puede ser MENOR que
   * la flota, y esa diferencia es informacion que la pantalla debe decir ("N sin ubicacion"), no un
   * error a esconder.
   */
  obtenerMapa: () => httpClient.get<MapaResponseDto>(`${BASE}/vehiculos`, configFlota),

  /**
   * GET /api/flota/mapa/vehiculos/{vehiculoFlotaId}/en-vivo -> 200 `VehiculoEnVivoDto` |
   * 404 `flota.vehiculo.no_existe`. Permiso `flota.vehiculos.leer`.
   *
   * El id es el **local** (`vehiculoFlotaId`, A-4), el mismo del deep-link mapa -> ficha. Un id de
   * otra organizacion devuelve **404**, igual que uno inexistente: nunca 403 — el tenant va en el
   * WHERE, asi que "de otra org" es indistinguible de "no existe".
   *
   * Superficie de UN recurso: aca los endpoints per-vehiculo de Telemetria SI son el camino correcto
   * (3 llamadas para 1 vehiculo no es fan-out), y por eso `rumbo` y `altitud` **si traen dato**, a
   * diferencia del listado del mapa (B-33).
   */
  obtenerEnVivo: (vehiculoFlotaId: string) =>
    httpClient.get<VehiculoEnVivoDto>(
      `${BASE}/vehiculos/${vehiculoFlotaId}/en-vivo`,
      configFlota,
    ),
}
