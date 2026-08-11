import type { DispositivosPageQuery, MotivoCierreAsignacion } from '@/services/contracts/flota'

/**
 * Vocabulario compartido por las 3 superficies que asignan un GPS a un vehiculo (tab del vehiculo,
 * modal del listado y paso 2 del wizard). Una sola definicion: si el contrato cambia, cambia aca.
 */

/**
 * Query de los CANDIDATOS a asignar. Constante de modulo A PROPOSITO, no un literal dentro del
 * render: es la key de React Query (`flotaKeys.dispositivosListado`) y un objeto recreado por render
 * con los mismos valores hashea igual, pero un valor derivado del reloj o de un `.filter()` no —
 * y eso ya produjo un bucle infinito de requests en este modulo (ver `query-keys.ts`).
 *
 * `stock: 'en_stock'` es la unica regla de elegibilidad que el backend acepta: cualquier otro estado
 * responde 409 `flota.dispositivo.no_disponible`. `soloActivos` deja fuera los dados de baja.
 *
 * ⚠️ `pageSize: 100` es el MAXIMO del contrato (`PageQuery`: > 100 se normaliza a 100). Una
 * organizacion con mas de 100 equipos en stock no los ve todos aca, y el buscador de este selector
 * es LOCAL sobre lo cargado — el listado no declara ningun parametro `search`. Por eso, cuando la
 * pagina no alcanza, el componente lo DICE en vez de fingir que la lista esta completa.
 */
export const QUERY_DISPOSITIVOS_EN_STOCK: DispositivosPageQuery = {
  stock: 'en_stock',
  soloActivos: true,
  page: 1,
  pageSize: 100,
  sortBy: 'FechaCreacion',
  sortDirection: 'Desc',
}

/**
 * Motivos de cierre que la UI OFRECE al desasociar a mano.
 *
 * El catalogo `motivos_cierre_asignacion_flota` tiene 4 codigos y `reasignacion` NO esta aca: ese lo
 * escribe el backend solo, cuando el cierre lo causa un `POST` de asignacion que reemplaza al GPS
 * anterior (D-S3-14). Ofrecerlo en un cierre manual grabaria en el historial un reemplazo que nunca
 * ocurrio. El backend igual lo acepta; la restriccion es de UI y esta declarada como tal.
 */
export const MOTIVOS_CIERRE_MANUAL: MotivoCierreAsignacion[] = ['reparacion', 'baja', 'otro']

/** Default del contrato: sin body, el backend cierra con `otro` (D-S3-15). */
export const MOTIVO_CIERRE_DEFECTO: MotivoCierreAsignacion = 'otro'

export function claveDeMotivoCierre(motivo: MotivoCierreAsignacion): string {
  return `motivoCierreAsignacion.${motivo}`
}

/**
 * Como tiene que REACCIONAR la pantalla ante un fallo de asignacion / desasignacion.
 *
 * ⚠️ SE RAMIFICA POR `code`, NUNCA POR STATUS. Los tres tratamientos que siguen conviven en el mismo
 * par de status (409/500) y piden acciones OPUESTAS del usuario; un `if (status === 500)` los
 * confunde y le da el consejo equivocado.
 *
 *  - `coordinacion` — **el caso peligroso**. La coordinacion con PlataformaCanonica no llego a
 *    destino: el backend NO persistio nada (D-S3-13), asi que el GPS **no quedo instalado** y el
 *    vehiculo no va a aparecer en el mapa. Es REINTENTABLE con exactamente los mismos datos. Si esto
 *    se mostrara como exito, o como un error generico de "recarga la pagina", el usuario se va
 *    creyendo que el equipo esta puesto y nadie vuelve a mirar.
 *  - `conflicto` — rechazo de NEGOCIO: el estado persistido cambio (otro usuario tomo el equipo, el
 *    vehiculo ya tiene otro GPS, un extremo canonico esta inactivo). Reintentar lo mismo vuelve a
 *    fallar: lo que corresponde es refrescar y elegir de nuevo.
 *  - `noEncontrado` — 404 uniforme. El recurso no existe, es de otra organizacion o la asociacion ya
 *    estaba cerrada. No hay reintento util.
 *  - `generico` — cualquier otra cosa, incluida la caida de red. **No promete nada sobre si se
 *    guardo o no**, porque no se sabe: un request que nunca volvio pudo haber llegado igual.
 */
export type TratamientoErrorAsignacion = 'coordinacion' | 'conflicto' | 'noEncontrado' | 'generico'

const CODES_COORDINACION = new Set(['flota.dispositivo.canonico_no_coordinable'])

const CODES_CONFLICTO = new Set([
  'flota.dispositivo.no_disponible',
  'flota.vehiculo.ya_tiene_dispositivo',
  'flota.vehiculo.conflicto_canonico',
  'flota.asignacion.canonico_inactivo',
])

const CODES_NO_ENCONTRADO = new Set([
  'flota.vehiculo.no_existe',
  'flota.dispositivo.no_existe',
  'flota.dispositivo.canonico_no_existe',
  'flota.asignacion.no_existe',
  'flota.recurso.organizacion_invalida',
])

export function tratamientoDeErrorAsignacion(code: string | null): TratamientoErrorAsignacion {
  if (code === null) return 'generico'
  if (CODES_COORDINACION.has(code)) return 'coordinacion'
  if (CODES_CONFLICTO.has(code)) return 'conflicto'
  if (CODES_NO_ENCONTRADO.has(code)) return 'noEncontrado'
  return 'generico'
}
