import { appConfig } from '@/config/env'
import { httpClient } from '@/services/http/http-client'
import type {
  ActualizarReglaProblemaRequest,
  CrearReglaProblemaRequest,
  PagedResult,
  ReglaProblemaDto,
  ReglasPageQuery,
} from '@/services/contracts/flota'

/**
 * Cliente HTTP de la seccion §Reglas operativas de problemas (`ReglasProblemasController`, slice-06
 * `f-04`). Las **3 filas del contrato, completas** — `api.md` no declara ninguna mas.
 *
 * ⚠️ La ruta cuelga de `/api/flota/problemas/reglas`, que es la del contrato. No colisiona con el
 * detalle del problema (`{problemaId:guid}`) porque `reglas` no es un guid, y ante empate ASP.NET
 * prefiere el segmento literal.
 *
 * ══ LO QUE NO EXISTE, TRANSCRIPTO DE `api.md` (que solo declara 3 filas) ═════════════════════════
 *  - **No hay `DELETE`**: la baja operativa de una regla es **pausarla** (`PATCH { activa: false }`).
 *    Una regla borrada dejaria problemas huerfanos de su origen. El boton "Eliminar" no va.
 *  - **No hay `GET /reglas/{reglaId}`**: por eso el `POST` devuelve **200 con el cuerpo** y no 201
 *    con `Location` — un `CreatedAtAction` apuntaria a una URL rota.
 *  - **No hay export de reglas**, ni "probar regla", ni "ver activaciones". Sin fila en `api.md` no
 *    hay ruta, y resolverlos client-side esta **prohibido** (`f-10` paso 6/8).
 *  - **No hay filtros ni `sortBy`** (B-17): `ReglasPageQuery` es `PageQuery` pelado. El unico
 *    ORDER BY es nombre ASC, id ASC, resuelto por el server.
 *
 * ══ LO QUE EL ALTA/EDICION NO ACEPTA, Y POR QUE IMPORTA ═════════════════════════════════════════
 * `CrearReglaProblemaRequest` **no declara** `vehiculosIds`, `geozonasIds`, `conductoresIds`,
 * `destinatarios` ni `canalesInternos`, que `dtos.ts` si publica: son 3 relaciones N:M y 2 listas
 * **sin tabla puente ni columna** en ningun documento normativo (PENDIENTE #2). Aceptarlos para
 * descartarlos en silencio es el "filtro que no filtra" que D-S3-33 corrigio.
 *
 * **Consecuencia que la pantalla tiene que DECIR, no ocultar: hoy toda regla alcanza a TODA la
 * organizacion.** El modal no ofrece selector de alcance porque no hay alcance que elegir.
 *
 * ══ ERRORES QUE ESTA SUPERFICIE PUEDE DEVOLVER ══════════════════════════════════════════════════
 *  - 400 `flota.regla.condicion_invalida` con `args {indice, motivo}` — las 9 causas del DSL viven
 *    una sola vez en el dominio del server; `MotivoCondicionInvalida` las espeja en el contrato.
 *    `indice` viaja `null` en las 3 causas que no son de una condicion concreta.
 *  - 404 `flota.regla.no_existe` — tambien cross-tenant, nunca 403.
 *  - ⚠️ **Nombre duplicado NO tiene `code`** (DA-PR-07) y tampoco hay indice unico sobre `nombre`.
 *    La UI **no debe anticipar** un code que no existe.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

const BASE = '/api/flota/problemas/reglas'

const configFlota = { baseURL: appConfig.flotaApiBaseUrl } as const

export const reglasService = {
  /**
   * GET /api/flota/problemas/reglas -> 200 `PagedResult<ReglaProblemaDto>`.
   * Permiso `flota.reglas.leer`.
   *
   * ⚠️ Hoy devuelve **0 filas en toda organizacion**, y no es un vacio de configuracion del usuario:
   * las 8 reglas seed de `motor-de-reglas.md` §7 **no se siembran** porque
   * `FlotaActivacionSeedService` no existe (deuda de slice-01) y la tabla de configuracion
   * por-organizacion no la nombra ningun documento (PENDIENTE #4). El empty-state "Aun no
   * configuraste reglas" es cierto, pero el motivo no es el que el usuario supone.
   *
   * 5 campos del DTO viajan en 0 / vacio SIEMPRE (alcance y activaciones): ver el contrato §10.3.
   */
  listar: (query: ReglasPageQuery = {}) =>
    httpClient.get<PagedResult<ReglaProblemaDto>>(BASE, {
      ...configFlota,
      params: query,
    }),

  /**
   * POST /api/flota/problemas/reglas -> **200** `ReglaProblemaDto` (no 201) |
   * 400 `flota.regla.condicion_invalida`. Permiso `flota.reglas.gestionar`.
   *
   * `condicionJson` se valida contra el DSL v1 **entero** antes de persistir: una condicion invalida
   * devuelve 400 y **no persiste ninguna fila**. No existe "regla rota" en DB.
   *
   * ⚠️ `condiciones[].umbral_minutos` viaja en **snake_case** (el backend le puso
   * `[JsonPropertyName]`), a diferencia del resto del contrato. Mandarlo camelizado lo deja en
   * `null` y la regla se rechaza con `motivo: 'umbral_minutos_invalido'`.
   */
  crear: (data: CrearReglaProblemaRequest) =>
    httpClient.post<ReglaProblemaDto>(BASE, data, configFlota),

  /**
   * PATCH /api/flota/problemas/reglas/{reglaId} -> 200 `ReglaProblemaDto` |
   * 400 `flota.regla.condicion_invalida` | 404 `flota.regla.no_existe`.
   * Permiso `flota.reglas.gestionar`.
   *
   * **Un solo endpoint para las 4 acciones** (editar / activar / pausar / ajustar, DA-PR-08).
   * `activa: false` es la pausa, que es la baja operativa. `tipo` **no se edita**: el request ni
   * siquiera lo declara, asi que mandarlo es un no-op silencioso.
   *
   * ⚠️ **No borra campos** (B-18): lo ausente se preserva. `webhookEndpointId: null` **no
   * desvincula** el webhook, aunque `dtos.ts` lo prometa — igual que `proveedorSimId` en el
   * dispositivo. Si la pantalla ofrece "quitar webhook", tiene que avisar que hoy no se puede.
   */
  actualizar: (reglaId: string, data: ActualizarReglaProblemaRequest) =>
    httpClient.patch<ReglaProblemaDto>(`${BASE}/${reglaId}`, data, configFlota),
}
