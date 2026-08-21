import type { AlertaListItemDto, PagedResult, SeveridadAlerta } from '@/services/contracts/flota'
import type { VarianteBadge } from '@/shared/ui/Badge'

/**
 * Vocabulario de SEÑALES EMBEBIDAS (`f-12`) — las reglas de las 3 superficies donde las señales
 * aparecen **donde el operador ya esta**: la columna del listado de vehiculos, el panel de la ficha
 * del vehiculo y el anillo del marcador del mapa.
 *
 * Todo lo que se puede anclar por test vive aca y no en el JSX, igual que `vocabulario-conexion.ts`
 * y `vocabulario-mapa.ts`. Este archivo **no importa Leaflet ni React**: el runner corre con
 * `environment: node`.
 *
 * ══ LA DECISION QUE GOBIERNA TODO EL PASO ═══════════════════════════════════════════════════════
 * **Hoy no existe ni una señal en ninguna organizacion, y no puede existir.** El catalogo
 * `tipos_alerta_flota` se creo VACIO a proposito (GATE 2 / **B-38**: el contrato publica dos
 * catalogos distintos de `tipo_alerta` y elegir uno es acto del PO) y la FK rechaza toda insercion.
 * `GET /api/flota/alertas` devuelve `items: []` y `totalItems: 0` **siempre**.
 *
 * ⇒ Consecuencia directa sobre el diseño: **la ausencia de badge NO puede quedar muda.** Un badge que
 * no aparece se lee como "este vehiculo esta bien", y eso es exactamente lo que la pantalla no sabe.
 * La lectura correcta es "la deteccion todavia no esta conectada", que es otra cosa: la primera es
 * una afirmacion sobre el vehiculo, la segunda es una afirmacion sobre el sistema.
 *
 * Es la misma clase de mentira que slice-05 corrigio 4 veces con `sin_dato` ("Sin señal aun" elegia
 * una de las 3 causas posibles), y por eso se resuelve con el mismo mecanismo: un estado propio, con
 * su copy propio, decidido en el vocabulario y no en la celda.
 *
 * `DETECCION_DE_SENALES_CONECTADA` es el unico interruptor. Mientras sea `false`:
 *  - ninguna superficie dice "sin señales" ni "todo en orden";
 *  - toda superficie que embebe señales declara, UNA vez por pantalla, que la deteccion no corre;
 *  - el marcador del mapa conserva su color de conexion y **no** gana anillo de severidad.
 *
 * El dia que el PO cierre GATE 2, se pone en `true` y las 4 ramas de `lecturaDeSenales` empiezan a
 * distinguir "sin señales" de "no lo sabemos" **sin tocar un solo componente**.
 */

/* ══ 1. Los dos interruptores de capacidad ════════════════════════════════════════════════════ */

/**
 * ¿La deteccion de señales esta conectada de punta a punta?
 *
 * **`false`, y no es pesimismo defensivo**: es un hecho verificado contra el backend cerrado
 * (`AlertaDtos.cs`, `ddl.sql` §6.1, `ESTADO.md` §GATE 2). No hay **ni un escritor de alertas** en
 * toda la solucion — no es que no haya datos todavia, es que la fila no se puede escribir.
 *
 * ⚠️ Este flag NO se deriva de la respuesta (`items.length === 0`), y la diferencia importa: una
 * organizacion con la deteccion conectada y cero señales abiertas es un caso **legitimo y bueno**,
 * y ahi el copy correcto SI es "sin señales". Derivarlo de la lista colapsaria los dos casos, que es
 * justo la mentira que este archivo existe para impedir.
 *
 * Anclado por test: el dia que esto pase a `true` se ponen rojos los casos que hoy afirman que la
 * rama `sin_senales` es inalcanzable. Es la señal de que hay que releer el copy, no fragilidad.
 */
export const DETECCION_DE_SENALES_CONECTADA = false

/**
 * ¿Se puede navegar de una señal al problema que la agrupo?
 *
 * **`false` — PARADA declarada.** `f-12` paso 2 pide `onVerProblema` → `/app/flota/problemas?ticket=
 * <problemaId>`, y **ese id no existe en ninguna parte del contrato**: `AlertaListItemDto` tiene 12
 * campos y ninguno es `problemaId`, y `alertas_operativas_flota` (`ddl.sql` §6.1) no tiene columna
 * hacia `problemas_operativos_flota`. Son **dos tablas disjuntas**: las señales que un problema
 * agrupa viven en `problemas_senales_flota` (§6.3), que es otra tabla, con otro shape, y solo se lee
 * en la direccion problema → señales.
 *
 * O sea que el enlace no es "todavia no lo cableamos": no hay dato con el que construirlo. Se ofrece
 * el enlace al **Centro de Problemas** sin preseleccion, y la pantalla lo dice — un `?ticket=` con un
 * id inventado abriria el ticket equivocado.
 */
export const CORRELACION_SENAL_PROBLEMA_DISPONIBLE = false

/**
 * Cuantas señales se piden por pagina para armar el indice.
 *
 * `GET /api/flota/alertas` **pagina y no acepta ningun filtro** (`AlertasPageQuery` es `PageQuery`
 * pelado, B-17): no hay `?vehiculoId=`. Asi que la unica forma de alimentar N filas con **una sola
 * request** —que es lo que `f-12` paso 3 exige explicitamente, "no una por fila"— es traer una pagina
 * grande e indexar en cliente.
 *
 * De ahi sale `parcial`: si el total supera lo traido, el indice **no alcanza para toda la flota** y
 * la pantalla tiene que decirlo en vez de pintar filas sin badge como si estuvieran limpias. Hoy es
 * inalcanzable (el total es 0), pero es la primera trampa que aparece el dia que GATE 2 cierre.
 *
 * ⚠️ **100 es el TECHO del contrato, no una eleccion.** `PageQuery` normaliza `pageSize > 100 -> 100`
 * server-side (`dtos.ts` §1), asi que pedir mas no trae mas: traeria exactamente lo mismo y dejaria
 * la constante mintiendo sobre lo que pasa. O sea que el indice **nunca** puede cubrir una flota con
 * mas de 100 señales abiertas de una sola request — por eso `parcial` no es defensa teorica: es el
 * caso normal apenas la deteccion se conecte en una flota mediana. Cerrarlo de verdad exige un
 * filtro por vehiculo en `api.md` §Alertas, que hoy no existe (**B-17**).
 */
export const PAGINA_DE_SENALES = 100

/** Query fija del listado de señales. Constante de modulo: la misma referencia en cada render. */
export const QUERY_DE_SENALES = { page: 1, pageSize: PAGINA_DE_SENALES } as const

/* ══ 2. Severidad ═════════════════════════════════════════════════════════════════════════════ */

/**
 * Peso de cada severidad, para calcular el maximo.
 *
 * ⚠️ **Son 3 valores y no 4.** `f-12` §Contrato manda a `dtos.ts` §9 (`SeveridadProblema`), y ese es
 * el vocabulario del **problema**: 4 valores, con `critica`. El de la señal es
 * `severidades_alerta_flota` — `alta | media | baja` — y `dtos.ts` §10.1 lo aclara literal ("NO es el
 * mismo vocabulario... son 2 catalogos distintos, no uno con subconjunto", PENDIENTE #12).
 *
 * Consecuencia practica, para que no se busque: el ejemplo de verificacion de `f-12` ("un vehiculo
 * con 2 señales, una `critica` y una `media`") **no es construible**: ninguna señal puede ser
 * `critica`. Con `alta` + `media` el caso es el mismo y si es real.
 */
const PESO_DE_SEVERIDAD: Record<SeveridadAlerta, number> = { alta: 3, media: 2, baja: 1 }

/**
 * Variante del badge por severidad de SEÑAL.
 *
 * No reusa `varianteDeSeveridadProblema`: ese mapa tiene 4 entradas y este vocabulario tiene 3.
 * Compartir el `Record` obligaria a declarar una fila `critica` inalcanzable, que es exactamente el
 * tipo de valor muerto que B-32 dejo vivo en el filtro de conexion.
 *
 * `baja` es **neutro y no informativo**: una señal de severidad baja no es una novedad que merezca
 * color propio en una tabla de 8 columnas.
 */
const VARIANTE_POR_SEVERIDAD_ALERTA: Record<SeveridadAlerta, VarianteBadge> = {
  alta: 'peligro',
  media: 'advertencia',
  baja: 'neutro',
}

export function varianteDeSeveridadAlerta(severidad: SeveridadAlerta): VarianteBadge {
  return VARIANTE_POR_SEVERIDAD_ALERTA[severidad]
}

/**
 * La severidad mas alta de un conjunto de señales, o `null` si el conjunto esta vacio.
 *
 * Es lo que decide el color del marcador del mapa (`f-12` paso 5: "severidad **maxima**") y el badge
 * de la fila: con 2 señales, una `alta` y una `media`, el operador tiene que ver la `alta` — mostrar
 * la mas reciente esconderia la peor.
 */
export function severidadMaxima(
  senales: readonly AlertaListItemDto[],
): SeveridadAlerta | null {
  let maxima: SeveridadAlerta | null = null

  for (const senal of senales) {
    if (maxima === null || PESO_DE_SEVERIDAD[senal.severidad] > PESO_DE_SEVERIDAD[maxima]) {
      maxima = senal.severidad
    }
  }

  return maxima
}

/**
 * ¿La señal sigue viva?
 *
 * **`cerrada` es el unico terminal.** `gestionada` significa "alguien la reconocio", no "dejo de
 * pasar": su `fechaResolucion` sigue en `null` y el vocabulario de D-C6 la ubica entre `abierta` y
 * `cerrada`. Contarla como resuelta apagaria el badge de un vehiculo cuyo problema sigue abierto.
 *
 * ⚠️ Hoy `gestionada` es **inalcanzable**: `POST /alertas/{id}/gestionar` no esta enrutado (permiso
 * contradictorio entre 2 archivos del contrato + 2 errores sin `code`), asi que nada puede mover una
 * señal de `abierta`. La distincion queda escrita porque el dia que ese endpoint exista es la que
 * decide si el badge se apaga.
 */
export function esSenalActiva(senal: AlertaListItemDto): boolean {
  return senal.estado !== 'cerrada'
}

/* ══ 3. El indice — UNA request por pantalla, nunca una por fila ══════════════════════════════ */

export interface IndiceDeSenales {
  /**
   * **Todas** las señales por `vehiculoFlotaId`, en el orden en que las sirvio el backend (apertura
   * DESC, id DESC). Vacio mientras GATE 2 siga abierto.
   *
   * Incluye las `cerrada` a proposito: el panel de la ficha muestra "activas **y recientes**"
   * (`f-12` paso 4), asi que el historico corto es parte del dato. Lo que filtra por actividad es
   * quien decide el badge (`senalesActivasDelVehiculo`), no el indice — si el indice descartara las
   * cerradas, recuperarlas exigiria un segundo request que el endpoint no sabe acotar.
   */
  readonly porVehiculo: ReadonlyMap<string, readonly AlertaListItemDto[]>
  /** ¿Llego la respuesta? `false` mientras carga o si el request fallo. */
  readonly cargado: boolean
  /** ¿El listado trajo menos señales de las que hay? Ver `PAGINA_DE_SENALES`. */
  readonly parcial: boolean
  /** Copia del interruptor, para que quien consume el indice no tenga que importarlo aparte. */
  readonly deteccionConectada: boolean
}

const INDICE_VACIO: ReadonlyMap<string, readonly AlertaListItemDto[]> = new Map()

/**
 * Arma el indice `vehiculoFlotaId -> señales activas` de UNA sola respuesta.
 *
 * `f-12` §Verificacion lo pide explicito ("el listado hace **1** request de señales por pagina,
 * assert de conteo, no N+1") y es la unica forma posible: el endpoint **no acepta `?vehiculoId=`**,
 * asi que una request por fila serian N requests que ademas no se pueden filtrar.
 *
 * `vehiculo` es un campo **requerido** del DTO (`vehiculo_flota_id uuid NOT NULL`, D-S6-1), asi que
 * toda señal aterriza en exactamente una fila y el indice no pierde ninguna. Es lo que hace que el
 * listado de **vehiculos** pueda tener columna y los otros dos no — ver el encabezado de
 * `SenalesIndicador`.
 *
 * ⚠️ Un error del request **no** produce un indice "vacio": produce `cargado: false`. Colapsarlos
 * dejaria a la pantalla afirmando "ningun vehiculo tiene señales" justo cuando no pudo preguntarlo.
 */
export function indiceDeSenales(
  pagina: PagedResult<AlertaListItemDto> | undefined,
): IndiceDeSenales {
  if (pagina === undefined) {
    return {
      porVehiculo: INDICE_VACIO,
      cargado: false,
      parcial: false,
      deteccionConectada: DETECCION_DE_SENALES_CONECTADA,
    }
  }

  const porVehiculo = new Map<string, AlertaListItemDto[]>()

  for (const senal of pagina.items) {
    const existentes = porVehiculo.get(senal.vehiculo.vehiculoFlotaId)
    if (existentes === undefined) {
      porVehiculo.set(senal.vehiculo.vehiculoFlotaId, [senal])
      continue
    }
    existentes.push(senal)
  }

  return {
    porVehiculo,
    cargado: true,
    parcial: pagina.pagination.totalItems > pagina.items.length,
    deteccionConectada: DETECCION_DE_SENALES_CONECTADA,
  }
}

/** Todas las señales del vehiculo, activas y cerradas. Es lo que lista el panel de la ficha. */
export function senalesDelVehiculo(
  indice: IndiceDeSenales,
  vehiculoFlotaId: string,
): readonly AlertaListItemDto[] {
  return indice.porVehiculo.get(vehiculoFlotaId) ?? []
}

/** Solo las que siguen vivas. Es lo que decide el badge de la fila y el anillo del marcador. */
export function senalesActivasDelVehiculo(
  indice: IndiceDeSenales,
  vehiculoFlotaId: string,
): readonly AlertaListItemDto[] {
  return senalesDelVehiculo(indice, vehiculoFlotaId).filter(esSenalActiva)
}

/* ══ 4. Que muestra cada superficie ═══════════════════════════════════════════════════════════ */

/**
 * Los 4 desenlaces de una celda / panel de señales, y por que son 4 y no 2.
 *
 *  - `cargando` — todavia no llego la respuesta. No se afirma nada.
 *  - `deteccion_sin_conectar` — **el caso de hoy, el 100 % de las veces**. La deteccion no corre, asi
 *    que la ausencia de señales no dice nada sobre el vehiculo. Copy propio.
 *  - `sin_senales` — la deteccion corre y este vehiculo no tiene ninguna activa. **Es una buena
 *    noticia y recien aca se puede dar.** Hoy es INALCANZABLE, y esta anclado por test.
 *  - `con_senales` — severidad maxima + cantidad.
 *
 * Colapsar los dos del medio es la mentira que este paso existe para evitar.
 */
export type LecturaDeSenales =
  | { readonly tipo: 'cargando' }
  | { readonly tipo: 'deteccion_sin_conectar'; readonly clave: string; readonly claveAyuda: string }
  | { readonly tipo: 'sin_senales'; readonly clave: string; readonly claveAyuda: string }
  | {
      readonly tipo: 'con_senales'
      readonly severidad: SeveridadAlerta
      readonly cantidad: number
      readonly senales: readonly AlertaListItemDto[]
    }

export function lecturaDeSenales(
  indice: IndiceDeSenales,
  vehiculoFlotaId: string,
): LecturaDeSenales {
  // El orden importa: mientras la deteccion no este conectada, NADA de lo que diga (o no diga) la
  // respuesta habilita a decir "sin señales". Ni siquiera un 200 con lista vacia, que es lo que el
  // backend devuelve siempre.
  if (!indice.deteccionConectada) {
    return {
      tipo: 'deteccion_sin_conectar',
      clave: 'senales.celda.sinConectar',
      claveAyuda: 'senales.ayuda.sinConectar',
    }
  }

  if (!indice.cargado) return { tipo: 'cargando' }

  const senales = senalesActivasDelVehiculo(indice, vehiculoFlotaId)
  const severidad = severidadMaxima(senales)

  if (severidad === null) {
    // Con el indice PARCIAL no se puede afirmar que este vehiculo no tenga señales: puede tenerlas en
    // una pagina que no se trajo. Se degrada al mismo tratamiento que la ausencia de fuente.
    return indice.parcial
      ? {
          tipo: 'deteccion_sin_conectar',
          clave: 'senales.celda.sinConectar',
          claveAyuda: 'senales.ayuda.indiceParcial',
        }
      : {
          tipo: 'sin_senales',
          clave: 'senales.celda.sinSenales',
          claveAyuda: 'senales.ayuda.sinSenales',
        }
  }

  return { tipo: 'con_senales', severidad, cantidad: senales.length, senales }
}

/* ══ 5. El aviso de pantalla ══════════════════════════════════════════════════════════════════ */

/**
 * Que declara la pantalla ARRIBA, una sola vez, sobre la capa de señales.
 *
 * Es lo que impide que 20 celdas en `—` (o 20 marcadores sin anillo) se lean como "20 vehiculos
 * bien". La celda sola no alcanza: nadie lee 20 tooltips.
 *
 *  - `deteccion_sin_conectar` — hoy, siempre.
 *  - `indice_parcial` — la deteccion corre pero se trajo menos de lo que hay.
 *  - `sin_fuente` — el request de señales fallo. La pantalla **no se rompe** (`f-12` paso 8:
 *    partial-data), pero tampoco puede callarse: sin el aviso, un 500 en `/alertas` deja la columna
 *    entera muda y la pantalla vuelve a leerse como "todo bien".
 *  - `ninguno` — la deteccion corre, el indice esta completo y llego bien. No hay novedad que dar.
 */
export type AvisoDeSenales =
  | 'deteccion_sin_conectar'
  | 'indice_parcial'
  | 'sin_fuente'
  | 'ninguno'

export function avisoDeSenales(indice: IndiceDeSenales, fallo: boolean): AvisoDeSenales {
  if (!indice.deteccionConectada) return 'deteccion_sin_conectar'
  if (fallo) return 'sin_fuente'
  if (indice.parcial) return 'indice_parcial'
  return 'ninguno'
}

/* ══ 6. El marcador del mapa ══════════════════════════════════════════════════════════════════ */

/**
 * Clase del **anillo** de severidad del marcador.
 *
 * `f-12` paso 5 es explicito: la capa de severidad **se superpone, no reemplaza** el color de estado
 * de conexion que dejo slice-05. Por eso es un anillo y no un relleno: el punto sigue diciendo si el
 * vehiculo reporta (verde / rojo / gris) y el anillo dice si tiene señales abiertas. Pisar el relleno
 * borraria la unica lectura de conexion que el mapa tiene.
 *
 * `null` (sin señales, o deteccion sin conectar) ⇒ **sin clase**: el marcador queda exactamente como
 * lo dejo slice-05. El color NO se escribe aca — se resuelve en `components/mapa/mapa.css` contra los
 * tokens semanticos, igual que `claseDelMarcador`.
 */
export function claseDeAnilloDeSeveridad(severidad: SeveridadAlerta | null): string | null {
  if (severidad === null) return null
  return `marcador--senal-${varianteDeSeveridadAlerta(severidad)}`
}

/**
 * Severidad maxima de las señales activas de un vehiculo, para el marcador.
 *
 * Devuelve `null` mientras la deteccion no este conectada: sin eso, el mapa quedaria dependiendo de
 * que la lista este vacia, que es la derivacion que este archivo prohibe.
 */
export function severidadDelMarcador(
  indice: IndiceDeSenales,
  vehiculoFlotaId: string,
): SeveridadAlerta | null {
  if (!indice.deteccionConectada) return null
  return severidadMaxima(senalesActivasDelVehiculo(indice, vehiculoFlotaId))
}

/* ══ 7. Claves i18n por concatenacion (las ancla `vocabularios-i18n.test.ts`) ═════════════════ */

/**
 * Etiqueta del tipo de señal.
 *
 * ⚠️ **El catalogo `tipos_alerta_flota` esta VACIO** (GATE 2), asi que el conjunto de codigos posibles
 * **no se conoce**: el contrato publica dos listas que ni siquiera se solapan literalmente
 * (`dtos.ts` §8 vs `datos.md` §8 + `eventos.md`), y sembrar la union habria consolidado la decision
 * del PO. Por eso esto NO enumera nada y cae al `defaultValue` con el codigo crudo: el dia que el PO
 * elija, las etiquetas se agregan sin tocar codigo, y hasta entonces ninguna grafia queda escrita en
 * el frontend.
 */
export function claveDeTipoAlerta(tipo: string): string {
  return `tipoAlerta.${tipo}`
}
