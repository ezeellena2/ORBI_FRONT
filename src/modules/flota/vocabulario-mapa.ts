import type { EstadoConexion, EstadoMotor, MapaItemDto, SeveridadAlerta } from '@/services/contracts/flota'
import type { EntidadUbicada } from '@/shared/patrones/mapa/geometria'
import { varianteDeConexion } from './vocabulario-conexion'
import type { VarianteBadge } from '@/shared/ui/Badge'

/**
 * Vocabulario del MAPA EN VIVO — las reglas de la pantalla, separadas del JSX para poder anclarlas.
 *
 * ⚠️ Este archivo NO importa `leaflet` ni `react-leaflet`, y es a proposito: el proyecto de tests
 * corre con `environment: node`, asi que un import de Leaflet (que toca `window` al cargarse) pone el
 * runner en rojo. Todo lo que se puede probar vive aca; lo que necesita el mapa real vive en
 * `components/mapa/`, que ningun test importa.
 *
 * ══ LO QUE ESTA PANTALLA NO PUEDE AFIRMAR ═══════════════════════════════════════════════════════
 * El endpoint del mapa devuelve SOLO los vehiculos con posicion conocida: un vehiculo sin
 * coordenadas —ni frescas ni en la cache de 60 s— **sale del array** en vez de dibujarse en `0,0`
 * (que es un punto real en el golfo de Guinea). O sea que `items.length` puede ser mucho menor que
 * la flota, y esa diferencia NO es un error: es informacion que la pantalla tiene que decir.
 *
 * Un mapa con 3 pines sobre una flota de 20, sin explicacion, se lee como "perdi 17 vehiculos".
 * Por eso `contarFueraDelMapa` existe, y por eso devuelve `null` cuando todavia no se sabe el total:
 * un numero inventado es peor que ningun numero.
 */

/**
 * Cadencia del polling, en ms. El contrato fija **10-15 s** (`api.md` §Mapa en vivo, decision C-9);
 * 12 s es el centro de esa banda.
 *
 * SSE/WebSocket son **fase 2 por contrato**: no se implementan ni se "preparan".
 */
export const POLLING_MAPA_MS = 12_000

/* ---------------------------------------------------------------------------
 * Filtros del panel izquierdo — todos CLIENT-SIDE
 *
 * `GET /api/flota/mapa/vehiculos` **no acepta ningun query param** (P6 abierta): el binder descarta
 * lo que no conoce, asi que mandar `?estado=` devolveria la flota entera y el usuario creeria que
 * filtro. Se filtra sobre lo que ya llego, que ademas no pagina.
 * ------------------------------------------------------------------------- */

export interface FiltrosDelMapa {
  /** Texto libre: matchea patente y nombre del conductor. */
  readonly busqueda: string
  /** Codigo de `EstadoConexion`, o `''` = sin filtro. */
  readonly estado: EstadoConexion | ''
}

export const FILTROS_DEL_MAPA_VACIOS: FiltrosDelMapa = { busqueda: '', estado: '' }

export function hayFiltrosDeMapaActivos(filtros: FiltrosDelMapa): boolean {
  return filtros.busqueda.trim() !== '' || filtros.estado !== ''
}

/**
 * Normalizacion para comparar patentes: sin espacios, sin guiones, sin acentos, en minuscula.
 *
 * Sin esto, buscar `ab123cd` no encuentra `AB 123 CD` — que es como el backend sirve la patente y
 * como el usuario la ve en pantalla. Es el mismo texto y hay que tratarlo como tal.
 */
function normalizar(texto: string): string {
  return sinAcentos(texto).replace(/[^a-z0-9]/g, '')
}

/** Normalizacion para nombres: conserva los espacios (buscar "juan p" tiene que encontrar algo). */
function normalizarNombre(texto: string): string {
  return sinAcentos(texto).trim()
}

/** `U+0300..U+036F` es el bloque de diacriticos combinantes que deja `normalize('NFD')`. */
function sinAcentos(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function coincideConBusqueda(item: MapaItemDto, busqueda: string): boolean {
  const texto = busqueda.trim()
  if (texto === '') return true

  const porPatente =
    item.patente !== null && normalizar(item.patente).includes(normalizar(texto))

  const nombre = item.conductorAsignado?.nombreCompleto ?? null
  const porConductor =
    nombre !== null && normalizarNombre(nombre).includes(normalizarNombre(texto))

  return porPatente || porConductor
}

/**
 * Aplica los filtros del panel. Devuelve un array NUEVO (no muta) y conserva el orden de entrada.
 *
 * ── LAS 4 CATEGORIAS DEL MOCKUP QUE NO SE PUEDEN CALCULAR ─────────────────────────────────────
 * El select del mockup ofrece "En ruta · Detenido · Alerta · Offline". Ninguna de las tres primeras
 * es un codigo del contrato:
 *  - **Alerta** sale de `alertasActivasCount > 0`, y ese campo viaja **siempre `null`** (**B-33**:
 *    no hay endpoint batch de alertas y traerlas por vehiculo seria el fan-out que C-17 prohibe).
 *    Un chip que nunca matchea nada afirmaria "no tenes ningun vehiculo en alerta".
 *  - **En ruta / Detenido** son la frontera de **DA-MV-05**, que sigue ABIERTA: no esta decidido si
 *    basta `velocidad > 0` o si exige la ignicion puesta. Elegir una es inventar la regla.
 * Lo que si es vocabulario cerrado y ya esta implementado en los 3 listados es el **estado de
 * conexion**, y es lo que este filtro ofrece — sin `incompleto`, igual que los listados (B-31).
 */
export function filtrarItemsDelMapa(
  items: readonly MapaItemDto[],
  filtros: FiltrosDelMapa,
): MapaItemDto[] {
  return items.filter((item) => {
    if (filtros.estado !== '' && item.estado !== filtros.estado) return false
    return coincideConBusqueda(item, filtros.busqueda)
  })
}

/* ---------------------------------------------------------------------------
 * Los que NO estan en el mapa
 * ------------------------------------------------------------------------- */

/**
 * Cuantos vehiculos de la flota quedaron fuera del mapa.
 *
 * `totalDeLaFlota` sale de `pagination.totalItems` del listado de vehiculos, que recorre **el mismo
 * universo** que el mapa: `MapaEnVivoService` llama a `ListarSinPaginar(orgId, new
 * VehiculosPageQuery())` y ese query trae `SoloActivos = true` por default, que es exactamente el
 * default del listado. Por eso la resta es exacta y no una estimacion.
 *
 * Devuelve `null` cuando el total todavia no se conoce (cargando, o el listado fallo). En ese caso
 * la pantalla dice la parte que SIEMPRE es cierta ("el mapa dibuja solo los que tienen posicion") y
 * **no** arriesga un numero.
 *
 * El maximo con 0 no es defensivo por gusto: las 2 respuestas llegan de requests distintos y pueden
 * cruzarse (un alta entre una y otra). Un negativo en pantalla es peor que un cero.
 */
export function contarFueraDelMapa(
  totalDeLaFlota: number | null | undefined,
  enElMapa: number,
): number | null {
  if (totalDeLaFlota === null || totalDeLaFlota === undefined) return null
  return Math.max(0, totalDeLaFlota - enElMapa)
}

/**
 * Cual de los vacios corresponde cuando el mapa no tiene un solo marcador.
 *
 * ⚠️ Son **TRES**, no dos, y el tercero es el que se colaba: "no se cuantos vehiculos hay".
 * `totalDeLaFlota` sale de un segundo request (`useTotalDeLaFlota`) que puede estar cargando o
 * **haber fallado** — y con el retry global en 1 y sin polling, un conteo fallado queda `undefined`
 * para siempre. Colapsar ese caso contra `total === 0` hacia que una organizacion con 20 vehiculos y
 * Telemetria caida leyera *"Aun no hay vehiculos para mostrar en el mapa · Agregar primer
 * vehiculo"*: la pantalla le decia que registre lo que ya registro, que es exactamente la mentira
 * que partir el vacio en dos existia para evitar. No es un flash: con el conteo en error es
 * permanente.
 *
 *  - `sin_flota` — el total es **0**. Es el unico caso donde el copy de alta es cierto.
 *  - `sin_posicion` — el total es **> 0**: ninguno de tus N vehiculos tiene posicion conocida.
 *  - `total_desconocido` — no se sabe el total. Se dice la parte que siempre es cierta ("ninguno de
 *    los vehiculos que reportan tiene posicion ahora"), **sin numero y sin el CTA de alta**.
 */
export type VacioDelMapa = 'sin_flota' | 'sin_posicion' | 'total_desconocido'

export function vacioDelMapa(totalDeLaFlota: number | null | undefined): VacioDelMapa {
  if (totalDeLaFlota === null || totalDeLaFlota === undefined) return 'total_desconocido'
  return totalDeLaFlota > 0 ? 'sin_posicion' : 'sin_flota'
}

/* ---------------------------------------------------------------------------
 * El "ahora" contra el que se mide la antiguedad
 * ------------------------------------------------------------------------- */

/**
 * Instante de referencia para la antiguedad de las posiciones.
 *
 * `dataUpdatedAt` **solo avanza cuando el fetch sale bien** (verificado en
 * `@tanstack/query-core/query.js`: es `successState` el unico que lo escribe; un refetch fallado
 * avanza `errorUpdatedAt`). Usarlo solo congelaba los chips: con la red cortada 10 minutos, arriba
 * aparecia "No pudimos actualizar el mapa" y cada chip seguia diciendo "hace 8 s" para siempre — el
 * banner decia "esto esta viejo" y los datos de al lado decian "esto es de recien".
 *
 * Tomar el **maximo** de los dos arregla ese caso sin traer `Date.now()` al render (que
 * `react-hooks/purity` prohibe, con razon: un reloj impuro produce texto distinto sin que haya
 * cambiado ningun dato). Cada intento fallido del polling corre el "ahora" 12 s mas adelante, asi
 * que la antiguedad crece a la vista.
 *
 * ⚠️ Lo que **no** cubre: `fetchStatus: 'paused'` (backend caido / navegador offline). Ahi no hay ni
 * exito ni error, asi que ninguno de los dos sellos avanza. Es el defecto de plataforma que
 * `ESTADO.md` ya documenta como observado y **sin dueño**, no algo propio del mapa.
 */
export function instanteDeReferencia(dataUpdatedAt: number, errorUpdatedAt: number): number {
  return Math.max(dataUpdatedAt, errorUpdatedAt)
}

/* ---------------------------------------------------------------------------
 * Como se pinta un marcador
 * ------------------------------------------------------------------------- */

/**
 * Variante del marcador = **la misma** que el badge de conexion del resto del modulo.
 *
 * No hay un segundo vocabulario de colores para el mapa: si `sin_dato` es gris en el listado, es
 * gris en el marcador. Lo contrario es como se llega a que la misma flota se lea distinto en dos
 * pantallas de la misma app.
 */
export function varianteDelMarcador(estado: EstadoConexion): VarianteBadge {
  return varianteDeConexion(estado)
}

/* ---------------------------------------------------------------------------
 * Adaptador al mapa compartido
 * ------------------------------------------------------------------------- */

/**
 * Lo que Flota le pasa a `<MapaORBI>`: una entidad ubicada **más la patente**.
 *
 * `EntidadUbicada` es el mínimo que el mapa necesita para DIBUJAR; `etiquetaDe` lo resuelve la
 * pantalla y necesita la patente, así que el tipo del módulo la agrega. Eso es exactamente para lo
 * que el mapa es genérico en `T extends EntidadUbicada`: el dominio viaja, el mapa no lo mira.
 *
 * ⚠️ El ejemplo de `07-capa-compartida.md` §4.3 mapea SOLO a los 5 campos de `EntidadUbicada` y
 * después llama `etiquetaDe={(i) => etiquetaDeVehiculo(i, t)}` — con ese mapeo la etiqueta no tiene
 * de dónde salir. Es un error del ejemplo, no del contrato: el `T extends` ya lo permite.
 */
export interface VehiculoEnMapa extends EntidadUbicada {
  readonly patente: string | null
}

/**
 * Traduce un item del contrato de Flota a lo que el mapa entiende.
 *
 * `estado` (conexión) pinta el RELLENO del marcador y `realce` (severidad de señales) el ANILLO —
 * son dos preguntas distintas y por eso no se pisan: "¿reporta?" y "¿tiene algo abierto?".
 */
export function aEntidadDelMapa(
  item: MapaItemDto,
  severidad: SeveridadAlerta | null,
): VehiculoEnMapa {
  return {
    id: item.vehiculoFlotaId,
    lat: item.ubicacion.latitud,
    lng: item.ubicacion.longitud,
    estado: item.estado,
    realce: severidad,
    patente: item.patente,
  }
}

/**
 * Clase CSS del marcador. El color NO se escribe aca: se resuelve en `components/mapa/mapa.css`
 * contra los tokens semanticos (`--s-exito`, `--s-peligro`, …).
 *
 * Leaflet inyecta el HTML del marcador el mismo, fuera del arbol de React, asi que el estilo tiene
 * que viajar por clase. Un color literal aca seria la 5.ª forma de la misma violacion que las reglas
 * de lint del repo cierran.
 */
export function claseDelMarcador(estado: EstadoConexion): string {
  return `marcador--${varianteDelMarcador(estado)}`
}

/**
 * ¿Se puede mostrar la velocidad al lado del estado?
 *
 * **Solo con `en_linea`.** Con `desconectado` el dato existe pero es viejo: el equipo dejo de
 * reportar, asi que "Desconectado · 45 km/h" presenta como actual la ultima velocidad conocida. Con
 * `sin_dato` directamente no hubo fila upstream — y ese es ademas el estado que sirve el mapa cuando
 * la posicion sale de la **cache** (D-S5-1), o sea justo cuando el dato es mas viejo.
 */
export function puedeMostrarVelocidad(estado: EstadoConexion): boolean {
  return estado === 'en_linea'
}

/* ---------------------------------------------------------------------------
 * Antiguedad de la posicion
 * ------------------------------------------------------------------------- */

export type UnidadAntiguedad = 'second' | 'minute' | 'hour' | 'day'

export interface AntiguedadDeLaSenal {
  readonly cantidad: number
  readonly unidad: UnidadAntiguedad
}

/**
 * Hace cuanto reporto esa posicion, en la unidad mas grande que no la redondee a cero.
 *
 * Se mide contra `ubicacion.fechaUtc`, que es el instante del reporte **en el dispositivo** — no el
 * momento en que Flota compuso la respuesta. Esa distincion es la que hace util el dato: cuando el
 * marcador sale de la **cache** del mapa (posicion vieja + `estado = sin_dato`), la antiguedad crece
 * sola y el usuario ve que ese pin no se actualiza, en vez de creer que el vehiculo esta quieto.
 *
 * ⚠️ Los negativos se recortan a 0. El reloj del navegador y el del servidor no estan sincronizados,
 * y "en 4 segundos" sobre una señal de GPS es un bug que se lee como un bug. Devuelve `null` si la
 * fecha no parsea: quien llama imprime su marcador de dato ausente, nunca "hace NaN".
 */
export function antiguedadDeLaSenal(
  fechaUtc: string | null | undefined,
  ahoraMs: number,
): AntiguedadDeLaSenal | null {
  if (!fechaUtc) return null

  const instante = new Date(fechaUtc).getTime()
  if (Number.isNaN(instante)) return null

  const segundos = Math.max(0, Math.round((ahoraMs - instante) / 1000))

  if (segundos < 60) return { cantidad: segundos, unidad: 'second' }
  if (segundos < 3600) return { cantidad: Math.floor(segundos / 60), unidad: 'minute' }
  if (segundos < 86_400) return { cantidad: Math.floor(segundos / 3600), unidad: 'hour' }
  return { cantidad: Math.floor(segundos / 86_400), unidad: 'day' }
}

/* ---------------------------------------------------------------------------
 * Claves i18n del panel derecho (tab "Actual")
 *
 * Se construyen por concatenacion, asi que ni el compilador ni `verificar-i18n.mjs` las ven: van
 * ancladas en `vocabularios-i18n.test.ts` contra los 2 JSON reales.
 * ------------------------------------------------------------------------- */

/**
 * Vocabulario del motor. **`ralenti` no se emite en v1** — su umbral es una PENDIENTE del PO
 * (`fronteras/telemetria.md` §4: los mockups usan 5, 22 y 42 minutos, mutuamente inconsistentes) y
 * el backend lo ancla por test. La clave existe igual porque el tipo del contrato la declara: el dia
 * que el PO cierre el umbral, la pantalla ya sabe decirlo.
 */
export const ESTADOS_MOTOR = ['encendido', 'apagado', 'ralenti'] as const satisfies readonly EstadoMotor[]

export function claveDeMotor(motor: EstadoMotor): string {
  return `mapa.motor.${motor}`
}

/**
 * Ignicion: `true`/`false` son afirmaciones, `null` **no lo es**.
 *
 * `ignicion` es `bool?` upstream (drift declarado contra `dtos.ts`, que la tipa `boolean`): sin fila
 * de Telemetria llega `null`. Devolver la clave de "apagada" ahi afirmaria que el motor esta
 * apagado, que es exactamente lo que no sabemos. `null` ⇒ la pantalla imprime su marcador de dato
 * ausente.
 */
export function claveDeIgnicion(ignicion: boolean | null | undefined): string | null {
  if (ignicion === null || ignicion === undefined) return null
  return ignicion ? 'mapa.ignicion.si' : 'mapa.ignicion.no'
}
