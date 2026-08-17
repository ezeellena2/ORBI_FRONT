import type { EstadoConexion } from '@/services/contracts/flota'
import type { VarianteBadge } from '@/shared/ui/Badge'

/**
 * Vocabulario de CONEXION — una sola definicion de como se traduce `EstadoConexion` a lo que ve el
 * usuario. Lo comparten los 3 listados, las 3 fichas y el mapa: si el contrato cambia, cambia aca.
 *
 * ══ LA TRAMPA DE SLICE-05, ESCRITA UNA VEZ ══════════════════════════════════════════════════
 * `sin_dato` NO ES `desconectado`. Son dos cosas de naturaleza distinta:
 *
 *  - `desconectado` es una AFIRMACION del upstream. El equipo venia reportando y dejo de hacerlo;
 *    el flip lo decide Telemetria con su umbral de 5 min (`fronteras/telemetria.md` §3) y Flota NO
 *    recalcula offline por su cuenta. Es una alerta legitima: algo pasa con ese equipo.
 *  - `sin_dato` es una AUSENCIA de fila upstream, y llega por tres caminos que la UI no distingue:
 *      (a) el equipo nunca reporto — un GPS `en_stock` jamas aparece en la fuente batch;
 *      (b) el vehiculo no tiene GPS instalado;
 *      (c) Telemetria no respondio, y entonces TODA la flota queda en `sin_dato` (partial-data,
 *          D-C1 a: 200 con los campos tecnicos en `null` y todo lo propio de Flota servido igual).
 *
 * Pintar los dos casos igual es la mentira mas facil de cometer en este slice y la mas cara: un
 * operador que ve su flota entera en rojo llama al proveedor de GPS por una flota que esta bien.
 * Por eso `sin_dato` es NEUTRO (nunca `peligro`) y tiene su propia linea de ayuda.
 *
 * ══ `incompleto` NO SE EMITE (B-31, abierta) ════════════════════════════════════════════════
 * El contrato lo define dos veces y distinto (`fronteras/telemetria.md` §3: "vehiculo sin
 * dispositivo asignado"; `datos.md` §2.1: "sin GPS **o** sin conductor") y el backend paro en vez
 * de elegir. Hoy un vehiculo sin GPS cae en `sin_dato`. El codigo sigue en el vocabulario porque el
 * tipo es cerrado y el filtro lo acepta, pero NINGUN filtro lo ofrece: ver
 * `VALORES_FILTRO_CONEXION`.
 */

/** Los 4 codigos del vocabulario cerrado, en orden de presentacion. */
export const ESTADOS_CONEXION = [
  'en_linea',
  'desconectado',
  'incompleto',
  'sin_dato',
] as const satisfies readonly EstadoConexion[]

/**
 * Los valores que un filtro de conexion puede OFRECER hoy. Son 3, no 4, y la ausencia de
 * `incompleto` es deliberada en los dos listados que lo tienen:
 *  - vehiculos (`?estado=`): matchea **0 filas** porque ninguna capa emite ese codigo (B-31);
 *  - dispositivos (`?conexion=`): es **inalcanzable** por construccion — significa "vehiculo sin
 *    dispositivo" y "dispositivo sin vehiculo" se mudo al filtro `asignacion` (B-32).
 *
 * En los dos casos el server responde 200 con **lista vacia**. Un chip que siempre devuelve cero
 * resultados sobre una flota que si tiene vehiculos sin GPS es peor que un chip ausente: el usuario
 * concluye que no tiene ninguno.
 *
 * El dia que el PO cierre B-31/B-32, este array crece y los filtros empiezan a matchear sin tocar
 * nada mas.
 */
export const VALORES_FILTRO_CONEXION = [
  'en_linea',
  'desconectado',
  'sin_dato',
] as const satisfies readonly EstadoConexion[]

/**
 * Mapeo `codigo -> variante de badge`. Es la CAPA 2 que la primitiva `Badge` deja afuera a
 * proposito: si el badge conociera los codigos habria que tocarlo cada vez que un modulo agrega un
 * estado.
 *
 * `sin_dato` es NEUTRO y no `peligro`: pintarlo de rojo afirmaria que el vehiculo esta mal cuando
 * lo que falta es la fuente. `incompleto` es `advertencia` (configuracion pendiente, no falla).
 */
const VARIANTE_POR_CONEXION: Record<EstadoConexion, VarianteBadge> = {
  en_linea: 'exito',
  desconectado: 'peligro',
  incompleto: 'advertencia',
  sin_dato: 'neutro',
}

export function varianteDeConexion(estado: EstadoConexion): VarianteBadge {
  return VARIANTE_POR_CONEXION[estado]
}

/** Etiqueta corta del badge. Las 4 claves viven en `flota:estadoConexion.*`. */
export function claveDeConexion(estado: EstadoConexion): string {
  return `estadoConexion.${estado}`
}

/**
 * Explicacion de una linea, para el tooltip / el texto secundario. Es la pieza que impide que el
 * usuario lea `sin_dato` como "se desconecto": la etiqueta sola no alcanza.
 *
 * Este es el copy del **vehiculo**. Para el inventario de equipos, `claveDeAyudaDeConexionDeEquipo`.
 */
export function claveDeAyudaDeConexion(estado: EstadoConexion): string {
  return `conexion.ayuda.${estado}`
}

/**
 * La misma ayuda, pero para el listado de DISPOSITIVOS — donde `sin_dato` significa otra cosa.
 *
 * Los codigos y las variantes son los mismos (es un vocabulario compartido, D-C8) y `en_linea` /
 * `desconectado` se explican igual: son afirmaciones sobre el equipo, no sobre el vehiculo. Lo que
 * cambia es `sin_dato`, y cambia de verdad:
 *
 *  - **Equipo NO instalado** (`vehiculoInstalado === null`: en stock, en reparacion, dado de baja):
 *    que no haya senal es **lo esperable**, no una falla. Un GPS en stock nunca aparecio en la
 *    fuente batch de Telemetria. Este es el caso que la consigna del slice marca como el mas facil
 *    de tratar mal: si el copy lo pinta como problema, el operador sale a revisar equipos sanos.
 *  - **Equipo instalado**: ahi si es una ausencia que puede importar — pero SIGUE sin ser
 *    `desconectado`, porque tampoco hubo una afirmacion del upstream: puede ser que nunca haya
 *    reportado, o que Telemetria no haya respondido (partial-data, D-C1 a).
 *
 * `incompleto` cae al copy de vehiculo a proposito: para un dispositivo ese valor es **inalcanzable**
 * (B-32 — significa "vehiculo sin dispositivo") y darle un copy propio seria escribir la explicacion
 * de un estado que ninguna fila puede tener.
 */
export function claveDeAyudaDeConexionDeEquipo(estado: EstadoConexion, instalado: boolean): string {
  if (estado !== 'sin_dato') return claveDeAyudaDeConexion(estado)
  return instalado ? 'conexion.ayudaEquipo.sinDato' : 'conexion.ayudaEquipo.sinDatoNoInstalado'
}

/**
 * Que muestra la columna "Ultima senal" del listado. Es la SEGUNDA celda que la trampa de este
 * slice alcanza, y la regla vive aca —y no en el JSX— por el mismo motivo que el resto del
 * vocabulario: es donde se puede anclar.
 *
 * `ultimaSenal` viene `null` **exactamente cuando no hubo fila upstream**. Verificado contra
 * `VehiculoFlotaService.MapearItem`, que la construye con `upstream is null ? null : ...` a partir
 * de la MISMA respuesta de la que sale `estado`: o sea que `ultimaSenal === null` implica
 * `estado === 'sin_dato'`, y esa ausencia llega por tres caminos que el DTO no distingue (nunca
 * reporto · no tiene GPS · Telemetria no respondio, y ahi caen TODAS las filas de golpe).
 *
 * Por eso la ausencia NO tiene copy propio: se rinde con el MISMO vocabulario que el badge. El copy
 * anterior de esta columna era "Sin senal aun", que elige el primero de los tres caminos — con
 * Telemetria caida la columna entera afirmaba "ninguno de estos vehiculos emitio nunca" sobre una
 * flota que reporta bien. Es la misma mentira que el badge evita al no pintar `sin_dato` de rojo,
 * cometida en la celda de al lado.
 */
export type LecturaUltimaSenal =
  | { readonly tipo: 'fecha'; readonly fechaUtc: string }
  | { readonly tipo: 'sin_dato'; readonly clave: string; readonly claveAyuda: string }

export function lecturaDeUltimaSenal(fechaUtc: string | null | undefined): LecturaUltimaSenal {
  if (fechaUtc === null || fechaUtc === undefined) {
    return {
      tipo: 'sin_dato',
      clave: claveDeConexion('sin_dato'),
      claveAyuda: claveDeAyudaDeConexion('sin_dato'),
    }
  }

  return { tipo: 'fecha', fechaUtc }
}

/**
 * ¿El estado sale de un dato REAL del upstream, o de su ausencia?
 *
 * `true` solo para `en_linea` y `desconectado`: los dos son afirmaciones que Telemetria hizo. Con
 * `false` la UI **no puede afirmar nada** sobre el equipo — ni que esta apagado, ni que no tiene
 * GPS, ni que fallo.
 */
export function hayFuenteDeConexion(estado: EstadoConexion): boolean {
  return estado === 'en_linea' || estado === 'desconectado'
}

/**
 * Cobertura de conexion de LO QUE SE ESTA VIENDO (una pagina del listado, o los marcadores del
 * mapa). Es el unico "contador" honesto que este slice puede producir: cuenta las filas que el
 * usuario tiene delante, **no la flota**.
 *
 * ⚠️ Los contadores del HEADER de los 3 listados (total de flota, con/sin GPS, en linea) siguen
 * **sin fuente** — B-35: no hay endpoint agregado ni campos de conteo en el response, y calcularlos
 * con la pagina actual daria un numero que cambia al paginar. No se derivan de aca.
 */
export interface CoberturaDeConexion {
  total: number
  /** Filas con dato real del upstream (`en_linea` | `desconectado`). */
  conFuente: number
  /** Filas sin fila upstream (`sin_dato` | `incompleto`). */
  sinFuente: number
  /**
   * `true` cuando hay filas y NINGUNA tiene fuente.
   *
   * ⚠️ Esto NO prueba que Telemetria este caida, y el copy no debe decirlo: una flota entera sin
   * GPS instalado da exactamente el mismo resultado, y el DTO no trae ningun flag que los distinga
   * (D-C1: el aviso de datos parciales es estado de PANTALLA, no campo del contrato). Lo unico
   * afirmable es "no hay datos de conexion para estas filas", que es lo que dice
   * `conexion.datosParciales.*`.
   */
  ningunaConFuente: boolean
}

export function coberturaDeConexion(
  estados: readonly EstadoConexion[] | undefined,
): CoberturaDeConexion {
  const lista = estados ?? []
  const conFuente = lista.filter(hayFuenteDeConexion).length

  return {
    total: lista.length,
    conFuente,
    sinFuente: lista.length - conFuente,
    ningunaConFuente: lista.length > 0 && conFuente === 0,
  }
}

/**
 * Por que la lista quedo vacia con un filtro de conexion aplicado. Devuelve la clave i18n de la
 * explicacion, o `null` si el vacio no lo causa —o no se puede atribuir a— el filtro de conexion.
 *
 * Sin esto, filtrar por "En linea" con Telemetria caida muestra "ningun vehiculo coincide con tus
 * filtros" — literalmente cierto y completamente enganoso: los vehiculos estan, lo que falta es la
 * fuente que decide si estan en linea.
 *
 * ⚠️ `hayOtrosFiltros` NO es un detalle: con una patente tipeada tambien, el vacio puede ser de la
 * patente, y culpar a la conexion seria inventar una causa. Una lista vacia no trae filas que
 * mirar, asi que la pantalla no tiene forma de saber cual de los dos filtros la vacio: cuando hay
 * mas de uno puesto, se vuelve al copy generico, que no afirma causa.
 */
export function claveDeVacioPorFiltroDeConexion(
  filtro: EstadoConexion | '',
  hayOtrosFiltros = false,
): string | null {
  return claveDeVacio(filtro, hayOtrosFiltros, 'conexion.vacio')
}

/**
 * La misma explicacion, para el listado de DISPOSITIVOS. Cambia solo el sujeto del copy ("ningun
 * equipo" en vez de "ningun vehiculo"): la regla es identica porque la causa es la misma — con
 * Telemetria sin responder TODO vale `sin_dato`, asi que `conexion=en_linea` devuelve lista vacia
 * sobre un inventario que esta entero.
 */
export function claveDeVacioPorFiltroDeConexionDeEquipo(
  filtro: EstadoConexion | '',
  hayOtrosFiltros = false,
): string | null {
  return claveDeVacio(filtro, hayOtrosFiltros, 'conexion.vacioEquipo')
}

function claveDeVacio(
  filtro: EstadoConexion | '',
  hayOtrosFiltros: boolean,
  namespace: string,
): string | null {
  if (filtro === '') return null
  if (filtro === 'incompleto') return `${namespace}.incompleto`
  if (filtro === 'sin_dato') return null
  if (hayOtrosFiltros) return null

  // `en_linea` / `desconectado`: los 2 dependen de que Telemetria haya respondido.
  return `${namespace}.sinFuente`
}
