import type { VarianteBadge } from '@/shared/ui/Badge'
import type {
  ConductoresPageQuery,
  EstadoConductor,
  MotivoCierreAsignacion,
} from '@/services/contracts/flota'

/**
 * Vocabulario compartido por las superficies que asignan un conductor a un vehiculo (tab Conductor
 * de la ficha del vehiculo, modal del listado de conductores y paso 3 del wizard) y por las que
 * cambian su estado operativo. Una sola definicion: si el contrato cambia, cambia aca.
 *
 * Es el gemelo de `dispositivos/vocabulario-asignacion.ts`, pero NO es su copia: la asignacion de
 * conductor **no coordina con PlataformaCanonica**, asi que no existe el tratamiento `coordinacion`
 * y no hay un caso "se persistio a medias". Los tratamientos son otros.
 */

/**
 * Query de los CANDIDATOS a asignar. Constante de modulo A PROPOSITO, no un literal dentro del
 * render: es la key de React Query (`flotaKeys.conductoresListado`) y un objeto recreado por render
 * con los mismos valores hashea igual, pero un valor derivado del reloj o de un `.filter()` no — y
 * eso ya produjo un bucle infinito de requests en este modulo (ver `query-keys.ts`).
 *
 * `asignacion: 'sin_vehiculo'` es lo que manda `f-07`: el selector ofrece conductores que no tienen
 * asignacion vigente. `soloActivos` deja fuera los dados de baja.
 *
 * ⚠️ NO FILTRA POR ESTADO, y es deliberado: el filtro `estado` de este listado NO es el catalogo de
 * estados operativos (`activo`/`inactivo` miran el flag de baja logica, no `suspendido`), asi que no
 * hay forma de pedirle al server "solo los asignables". Un conductor `suspendido` o con la licencia
 * vencida PUEDE aparecer en la lista y el backend lo rechaza con 409 al asignar. La UI puede
 * atenuarlo leyendo `estado` y `licencia.diasParaVencer` de cada fila, pero no puede prometer que la
 * lista ya viene filtrada.
 *
 * ⚠️ `pageSize: 100` es el MAXIMO del contrato (`PageQuery`: > 100 se normaliza a 100). Una
 * organizacion con mas de 100 conductores sin vehiculo no los ve todos, y el listado no declara
 * ningun parametro `search`: el buscador de este selector es LOCAL sobre lo cargado. Cuando la
 * pagina no alcanza, el componente lo DICE en vez de fingir que la lista esta completa.
 */
export const QUERY_CONDUCTORES_SIN_VEHICULO: ConductoresPageQuery = {
  asignacion: 'sin_vehiculo',
  soloActivos: true,
  page: 1,
  pageSize: 100,
  sortBy: 'Nombre',
  sortDirection: 'Asc',
}

/**
 * Destinos que el `POST .../estado` admite, en el orden del catalogo.
 *
 * `pendiente_documentacion` NO esta: es el estado con el que nace el conductor y el contrato lo
 * excluye POR TIPO. No se vuelve a "pendiente" por pedido del usuario.
 */
export type DestinoEstadoConductor = Exclude<EstadoConductor, 'pendiente_documentacion'>

export const DESTINOS_ESTADO_CONDUCTOR = [
  'disponible',
  'en_servicio',
  'pausado',
  'suspendido',
] as const satisfies readonly DestinoEstadoConductor[]

/**
 * Matriz de transiciones de `datos.md` §3.2, TRANSCRIPTA de `TransicionesConductor.Permitidas` (las
 * 5 aristas fijas) mas la regla "cualquiera -> `suspendido`", para que el selector no ofrezca
 * destinos que el backend rechaza con 409. **Es ergonomia, no autorizacion**: quien decide sigue
 * siendo el servidor, y la pantalla muestra el 409 si igual llega.
 *
 * ⚠️ DOS AUSENCIAS QUE NO SON OLVIDO — verificadas contra el dominio, no deducidas:
 *  - **`disponible -> pausado` NO existe**: se pausa desde `en_servicio`, no desde `disponible`.
 *  - **`en_servicio -> disponible` directo NO existe**: el camino declarado es
 *    `en_servicio -> pausado -> disponible`. Agregar el atajo "por simetria" es inventar una arista.
 *
 * ⚠️ `suspendido` NO TIENE SALIDA (B-22, abierta): el contrato declara "cualquiera -> suspendido" y
 * CERO aristas de vuelta, y el backend lo implementa literal. La unica salida operativa hoy es baja
 * logica + re-alta, que pierde el historial de estado. Por eso su fila es la lista vacia: un boton
 * "Rehabilitar" seria un 409 garantizado.
 *
 * El backend ademas rechaza el no-op (`estadoActual === estadoDestino`), asi que ningun estado se
 * lista a si mismo.
 */
export const TRANSICIONES_CONDUCTOR: Record<EstadoConductor, readonly DestinoEstadoConductor[]> = {
  pendiente_documentacion: ['disponible', 'suspendido'],
  disponible: ['en_servicio', 'suspendido'],
  en_servicio: ['pausado', 'suspendido'],
  pausado: ['en_servicio', 'disponible', 'suspendido'],
  suspendido: [],
}

export function destinosDeEstadoConductor(
  estadoActual: EstadoConductor,
): readonly DestinoEstadoConductor[] {
  return TRANSICIONES_CONDUCTOR[estadoActual]
}

/** Clave i18n del catalogo de estados operativos. El codigo `snake_case` es la clave. */
export function claveDeEstadoConductor(estado: EstadoConductor): string {
  return `estadoConductor.${estado}`
}

/**
 * Agrupacion 5 -> 3 del badge del listado (ficha §4). Es PRESENTACION, **no se persiste** y no viaja
 * a ningun request: el vocabulario que el backend conoce sigue siendo el de 5 codigos.
 *
 * `activo` (verde)   = `activo === true` y estado en {disponible, en_servicio, pausado}
 * `inactivo` (gris)  = `activo === false` **o** estado `suspendido`
 * `pendiente` (ambar)= estado `pendiente_documentacion`
 *
 * El orden de las ramas importa: `pendiente_documentacion` con `activo = false` se muestra como
 * INACTIVO (la baja gana), que es lo que el usuario necesita saber primero.
 */
export type BadgeEstadoConductor = 'activo' | 'inactivo' | 'pendiente'

export function badgeDeEstadoConductor(
  estado: EstadoConductor,
  activo: boolean,
): BadgeEstadoConductor {
  if (!activo) return 'inactivo'
  if (estado === 'suspendido') return 'inactivo'
  if (estado === 'pendiente_documentacion') return 'pendiente'
  return 'activo'
}

const VARIANTE_POR_BADGE: Record<BadgeEstadoConductor, VarianteBadge> = {
  activo: 'exito',
  inactivo: 'neutro',
  pendiente: 'advertencia',
}

/** Color del badge agrupado. Vive junto al mapeo 5→3 para que los dos cambien de a uno. */
export function varianteDeBadgeEstadoConductor(badge: BadgeEstadoConductor): VarianteBadge {
  return VARIANTE_POR_BADGE[badge]
}

/** Clave i18n del badge agrupado (`estadoConductorBadge.*`), distinta de la del catálogo de 5. */
export function claveDeBadgeEstadoConductor(badge: BadgeEstadoConductor): string {
  return `estadoConductorBadge.${badge}`
}

/**
 * Identidad VISIBLE de un conductor, en orden de preferencia, o `null` si no hay ninguna.
 *
 * Los 3 campos son nullable **por diseño del backend**, no por borde: el `find-or-create` del
 * Canonico GATEA LA PII y solo devuelve nombre/documento si la organizacion que llama ya tenia
 * relacion con esa Persona (`fronteras/plataforma-canonica.md` §5.1). Un conductor sin nombre NO es
 * un dato corrupto: es el caso normal cuando la persona nacio en otra organizacion.
 *
 * Devuelve `null` en vez de una cadena tipo "Sin nombre" a proposito: la frase de fallback es copy y
 * vive en i18n, en la superficie que la muestra. Una funcion pura que devuelve texto traducido
 * arrastraria `t` hasta acá y se volveria intesteable.
 */
export function identidadDeConductor(conductor: {
  nombreCompleto: string | null
  dni: string | null
  numeroLegajo: string | null
}): string | null {
  for (const candidato of [conductor.nombreCompleto, conductor.dni, conductor.numeroLegajo]) {
    if (candidato !== null && candidato.trim().length > 0) return candidato.trim()
  }

  return null
}

/**
 * Que puede AFIRMAR el pill del tab "Conductor" de la ficha del vehiculo.
 *
 * ⚠️ `VehiculoListItemDto.conductoresCount` viene **`0` en el 100% de las respuestas, tambien con
 * conductores asignados** (`VehiculoFlotaService.MapearItem` lo hardcodea; componerlo es alcance de
 * slice-05). O sea que el `0` NO significa "no tiene conductores": significa "Flota no lo compone".
 *
 * Pintar ese `0` en el pill —que es lo que hacia la ficha— es afirmar algo que el backend no sabe, y
 * encima contradice a la tarjeta de abajo cuando el usuario acaba de asignar a alguien. Por eso hay
 * tres resultados y ninguno miente:
 *
 *  - `conteo`   — el backend compuso el numero (hoy inalcanzable, listo para slice-05).
 *  - `al_menos` — el conteo no llego pero la asignacion se hizo en ESTA sesion: consta que hay **al
 *                 menos** una. No se dice "1", que seria ignorar a los secundarios que no vemos.
 *  - `sin_dato` — no se sabe. Se pinta el marcador de dato ausente, no un cero.
 */
export type PillConductores =
  | { tipo: 'conteo'; valor: number }
  | { tipo: 'al_menos'; valor: number }
  | { tipo: 'sin_dato' }

export function pillDeConductores(
  conductoresCount: number,
  asignadoEnEstaSesion: boolean,
): PillConductores {
  if (conductoresCount > 0) return { tipo: 'conteo', valor: conductoresCount }
  if (asignadoEnEstaSesion) return { tipo: 'al_menos', valor: 1 }
  return { tipo: 'sin_dato' }
}

/**
 * Motivo con el que se cierra la asignacion vigente cuando el cierre lo causa un CAMBIO de conductor.
 *
 * ⚠️ Es la decision INVERSA a la del gemelo de dispositivo, y a proposito. Alla `reasignacion` queda
 * fuera del select manual porque **lo escribe el backend solo** cuando el `POST` reemplaza al equipo
 * anterior (D-S3-14). Acá no hay reemplazo automatico: el `POST` de conductor **no cierra nada**, el
 * cierre lo emite la propia UI como primer paso del cambio, asi que `reasignacion` es exactamente lo
 * que ocurrio y cualquier otro codigo grabaria en el historial un motivo falso.
 */
export const MOTIVO_CIERRE_POR_CAMBIO: MotivoCierreAsignacion = 'reasignacion'

/**
 * Los requests que faltan para dejar asignado al conductor elegido.
 *
 * ⚠️ "CAMBIAR CONDUCTOR" NO ES ATOMICO Y NO HAY FORMA DE QUE LO SEA (`f-07` §2): son un `DELETE` de
 * la vigente y un `POST` de la nueva, dos requests, sin transaccion que los abrace. El caso feo es
 * real: si el `DELETE` sale bien y el `POST` falla, **el vehiculo queda sin conductor**. La pantalla
 * no puede tragarse eso — tiene que decirlo y ofrecer reintentar solo lo que falta.
 *
 * De ahi `cierreYaHecho`: en el reintento el `DELETE` **no se repite**. Repetirlo daria 404
 * `flota.asignacion.no_existe` y convertiria un reintento legitimo en un error nuevo que tapa el
 * problema original.
 *
 * Sin asignacion vigente conocida es un solo `POST`. Ojo: "no conocida" ≠ "no existe" — del lado del
 * vehiculo no hay ningun `GET` que exponga la asignacion vigente (B-19 + `conductoresAsignados` vacio
 * siempre), asi que si el vehiculo YA tenia principal, el gate real es el 409
 * `flota.vehiculo.ya_tiene_principal` que devuelve el indice unico parcial.
 */
export type PasoCambioConductor = 'cerrar' | 'asignar'

export function pasosDeCambioDeConductor(
  tieneVigenteConocida: boolean,
  cierreYaHecho: boolean,
): readonly PasoCambioConductor[] {
  return tieneVigenteConocida && !cierreYaHecho ? ['cerrar', 'asignar'] : ['asignar']
}

/**
 * Como tiene que REACCIONAR la pantalla ante un fallo de asignacion / desasignacion de conductor.
 *
 * ⚠️ SE RAMIFICA POR `code`, NUNCA POR STATUS. Los tratamientos conviven en los mismos status
 * (400/404/409/500) y piden acciones OPUESTAS del usuario.
 *
 *  - `elegirOtro` — el conductor elegido NO es asignable por su propio estado: esta `suspendido` o
 *    tiene la licencia vencida. Reintentar con el mismo conductor vuelve a fallar siempre: lo que
 *    corresponde es elegir otro, o arreglarle el estado / la licencia primero. Es el unico
 *    tratamiento que apunta al CONDUCTOR y no a la operacion.
 *  - `conflicto` — rechazo de negocio del OTRO extremo: el vehiculo ya tiene principal. Reintentar
 *    lo mismo vuelve a fallar; refrescar y elegir rol `secundario` o desasignar al principal si.
 *  - `noEncontrado` — 404 uniforme. El recurso no existe, es de otra organizacion o la asignacion ya
 *    estaba cerrada. No hay reintento util.
 *  - `generico` — cualquier otra cosa, incluida la caida de red. **No promete nada sobre si se
 *    guardo o no**, porque no se sabe: un request que nunca volvio pudo haber llegado igual.
 *
 * ⚠️ NO EXISTE UN TRATAMIENTO `coordinacion` como en el gemelo de dispositivo, y no es un olvido: la
 * asignacion de conductor no coordina con PlataformaCanonica, asi que no hay un caso "el backend no
 * persistio nada porque el Canonico no respondio". Lo que SI hay —y ningun `code` reporta— es que el
 * Canonico nunca se entera de la asignacion (B-20): la operacion es un exito real en Flota y aun asi
 * Notificaciones no avisa a nadie. Eso no se muestra como error; simplemente no se promete el aviso.
 */
export type TratamientoErrorAsignacionConductor =
  | 'elegirOtro'
  | 'conflicto'
  | 'noEncontrado'
  | 'generico'

const CODES_ELEGIR_OTRO = new Set([
  'flota.conductor.suspendido_no_asignable',
  'flota.conductor.licencia_vencida',
])

const CODES_CONFLICTO = new Set(['flota.vehiculo.ya_tiene_principal'])

const CODES_NO_ENCONTRADO = new Set([
  'flota.vehiculo.no_existe',
  'flota.conductor.no_existe',
  'flota.asignacion.no_existe',
  'flota.recurso.organizacion_invalida',
])

export function tratamientoDeErrorAsignacionConductor(
  code: string | null,
): TratamientoErrorAsignacionConductor {
  if (code === null) return 'generico'
  if (CODES_ELEGIR_OTRO.has(code)) return 'elegirOtro'
  if (CODES_CONFLICTO.has(code)) return 'conflicto'
  if (CODES_NO_ENCONTRADO.has(code)) return 'noEncontrado'
  return 'generico'
}
