import { httpClient } from '@/services/http/http-client'
import type {
  CatalogoGrowableItemDto,
  CrearModeloDispositivoRequest,
  CrearProveedorSimRequest,
} from '@/services/contracts/flota'

/**
 * Catalogos GROWABLES del dispositivo — `api.md` §Catalogos para selects, familia (b).
 *
 * Son la FUENTE de los dos selects del alta y la edicion de dispositivo (modelo de GPS y proveedor
 * de SIM). Hardcodear sus opciones esta PROHIBIDO (DA-DD-02 / DA-DL-03): el valor que viaja al
 * backend es un `id uuid` del catalogo, no un nombre.
 *
 * ── POR QUE ESTE ARCHIVO Y NO `catalogo-service.ts` ────────────────────────────────────────────
 * Son dos familias con dueno, DTO y verbos distintos, y `api.md` las separa a proposito:
 *  - `catalogo-service.ts` sirve el catalogo CANONICO del vehiculo (marcas, tipos), que vive en
 *    `PlataformaCanonica` (7203), es global y es SOLO LECTURA.
 *  - este sirve los 2 catalogos de `Flota` (7213), que son "global + por-org" y ADMITEN ALTA.
 * Colapsarlos en un archivo obliga a mezclar dos `baseURL` y dos shapes en el mismo objeto.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 * GROWABLE = global + por-org (`datos.md` §2.2):
 *  - el `GET` devuelve la UNION de las filas de plataforma (sembradas por D-S3-20) y las de la
 *    organizacion del JWT. Nunca las de otra organizacion.
 *  - el `POST` crea SIEMPRE con la organizacion del JWT. El body no tiene campo de organizacion ni
 *    de "global": si lo tuviera, seria una escalada de privilegio con forma de campo opcional.
 *
 * NINGUNO PAGINA: devuelven un array plano, no `PagedResult<T>`. Es la unica familia de listados de
 * Flota exenta de la convencion de paginacion, y lo esta por contrato.
 *
 * LO QUE NO EXISTE, y por eso no esta aca: no hay `PATCH` ni `DELETE` de una fila propia (B-13, del
 * PO). Una organizacion que se equivoca al tipear el nombre de su modelo CONVIVE con la fila para
 * siempre y la sigue viendo en el select. No se inventan los 2 verbos: `api.md` no los declara y el
 * catalogo de 44 permisos esta cerrado.
 */

const BASE = '/api/flota/catalogos'

export const catalogosDispositivoService = {
  /**
   * GET /api/flota/catalogos/modelos-dispositivo -> 200 CatalogoGrowableItemDto[].
   * Permiso `flota.dispositivos.leer`.
   */
  listarModelosDispositivo: () =>
    httpClient.get<CatalogoGrowableItemDto[]>(`${BASE}/modelos-dispositivo`),

  /**
   * POST /api/flota/catalogos/modelos-dispositivo -> 201 CatalogoGrowableItemDto |
   * 409 `flota.catalogo.nombre_duplicado` (`args {catalogo, nombre}`).
   * Permiso `flota.dispositivos.crear`.
   *
   * OJO con el alcance del 409: choca contra las filas de la PROPIA organizacion. Repetir el nombre
   * de una fila GLOBAL es legal por la forma del indice unico parcial y devuelve 201 (B-14), asi que
   * el select puede terminar mostrando dos entradas homonimas. Es deliberado, no un bug.
   */
  crearModeloDispositivo: (data: CrearModeloDispositivoRequest) =>
    httpClient.post<CatalogoGrowableItemDto>(`${BASE}/modelos-dispositivo`, data),

  /** GET /api/flota/catalogos/proveedores-sim -> 200 CatalogoGrowableItemDto[] (`fabricante` siempre null). */
  listarProveedoresSim: () =>
    httpClient.get<CatalogoGrowableItemDto[]>(`${BASE}/proveedores-sim`),

  /** POST /api/flota/catalogos/proveedores-sim -> 201 | 409 `flota.catalogo.nombre_duplicado`. */
  crearProveedorSim: (data: CrearProveedorSimRequest) =>
    httpClient.post<CatalogoGrowableItemDto>(`${BASE}/proveedores-sim`, data),
}
