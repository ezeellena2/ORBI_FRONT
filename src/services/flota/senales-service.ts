import { appConfig } from '@/config/env'
import { httpClient } from '@/services/http/http-client'
import type { AlertaListItemDto, AlertasPageQuery, PagedResult } from '@/services/contracts/flota'

/**
 * Cliente HTTP de la seccion §Alertas y senales operativas (`AlertasController`, slice-06 `f-04`).
 *
 * ⚠️ **POR QUE SE LLAMA `senales-service` Y NO `alertas-service`**: las alertas de Flota son
 * **senales detectadas**, no casos accionables. Lo accionable vive en el Centro de Problemas, y por
 * eso **no existe el grupo de permisos `flota.alertas.*`** (DA-02 cerrada) ni pantalla propia de
 * alertas — el permiso de esta lectura es `flota.vehiculos.leer`, porque leer senales es contexto
 * del vehiculo. El nombre lo fija `f-06` §Cambios clave (B-20), junto con la decision de no poner
 * un item "Alertas" en la navegacion.
 *
 * ⚠️ **ARCHIVO APARTE, NO EN `problemas-service`**: es otro controller, otro permiso y otro recurso.
 * El modulo tiene un service por controller desde slice-02.
 *
 * ══ ESTE LISTADO DEVUELVE 0 ITEMS SIEMPRE, Y NO ES UN BUG (GATE 2 / B-38) ═══════════════════════
 * **No hay ni un escritor de alertas en todo el backend.** El catalogo `tipos_alerta_flota` se creo
 * **vacio a proposito** porque el contrato publica DOS catalogos distintos de `tipo_alerta` —el de
 * `dtos.ts` §8 y el de `datos.md` §8 + `eventos.md`, que ni siquiera se solapan literalmente— y
 * elegir uno es acto del PO. La FK rechaza toda insercion, asi que ninguna alerta puede escribirse.
 * Sembrar la union de los 2 catalogos habria consolidado la decision del PO; por eso no se hizo.
 *
 * ⇒ **El vacio de esta superficie NO puede decir "no hay alertas"**: seria mentira. Tiene que decir
 * que la deteccion todavia no esta conectada. La clave de copy que se renderiza es
 * `senales.aviso.deteccion_sin_conectar` (`AvisoDeSenales`), y los motivos de lo bloqueado son
 * `centroBloqueado.gestionarAlerta` / `centroBloqueado.deteccionAlertas`.
 *
 * ══ LA OTRA FILA DE LA SECCION NO EXISTE ════════════════════════════════════════════════════════
 * `POST /api/flota/alertas/{alertaId}/gestionar` **no esta enrutado**, por 3 motivos a la vez:
 *  1. su **permiso esta contradictorio entre 2 archivos del contrato** — `api.md` dice
 *     `flota.vehiculos.editar` y se marca "NO ratificado"; `permisos.md` lo **ratifica** como
 *     `flota.problemas.gestionar` y ordena que `api.md` se alinee. No se alineo;
 *  2. sus 2 errores de negocio **no tienen `code`** en `errores.md` (alerta ya gestionada/cerrada;
 *     alerta inexistente, que exigiria extender la familia `flota.<recurso>.no_existe` a `alerta`);
 *  3. con GATE 2 abierto **no hay ninguna fila sobre la cual actuar**.
 * Llamarla seria un 404 de routing. No se expone metodo.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

const BASE = '/api/flota/alertas'

const configFlota = { baseURL: appConfig.flotaApiBaseUrl } as const

export const senalesService = {
  /**
   * GET /api/flota/alertas -> 200 `PagedResult<AlertaListItemDto>`.
   * Permiso **`flota.vehiculos.leer`** (no existe `flota.alertas.*`).
   *
   * ORDER BY apertura DESC, id DESC. **Sin filtros**: `api.md` §Alertas no declara ninguno — ni
   * `estado`, ni `severidad`, ni `desdeUtc`.
   *
   * **No compone Telemetria**: la fila es propia de Flota, asi que esta superficie no tiene camino a
   * 500 `flota.telemetria.no_disponible`.
   *
   * ⚠️ Devuelve `items: []` y `totalItems: 0` **siempre** (GATE 2). Ver el encabezado.
   */
  listar: (query: AlertasPageQuery = {}) =>
    httpClient.get<PagedResult<AlertaListItemDto>>(BASE, {
      ...configFlota,
      params: query,
    }),
}
