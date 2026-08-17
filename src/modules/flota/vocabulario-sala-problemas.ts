import type {
  AccionProblema,
  PaginationMetadata,
  ProblemaOperativoListItemDto,
  ProblemaSlaDto,
  ProblemaVehiculoDto,
} from '@/services/contracts/flota'

/**
 * Vocabulario de la SALA del Centro de Problemas — las reglas de la vista principal, separadas del
 * JSX para poder anclarlas por test (mismo criterio que `vocabulario-mapa.ts` en slice-05).
 *
 * `vocabulario-centro-problemas.ts` sigue siendo el dueño de los **catálogos** (badges, códigos,
 * claves i18n, clasificación de errores y la lista de capacidades bloqueadas). Acá vive lo que es
 * propio de la SALA: qué se puede derivar de una página de la bandeja y qué no.
 *
 * ══ LA PREGUNTA QUE DECIDE CADA LÍNEA DE ESTE ARCHIVO ═══════════════════════════════════════════
 * `GET /problemas` **no acepta ningún filtro ni `sortBy`** (B-17) y **no existe endpoint de
 * resumen** (DA-PC-01). O sea que todo número o agrupación que la Sala quiera mostrar sale de **la
 * página cargada**, no de la organización. Y una página es 20 filas de N ordenadas por prioridad.
 *
 * Por eso cada derivado de acá cae en una de tres categorías, y ninguna se mezcla:
 *  1. **Verdad del servidor** — `pagination.totalItems` es el total real de problemas de la
 *     organización. Se puede afirmar sin adjetivos.
 *  2. **Verdad de la página** — se puede mostrar, pero el copy tiene que decir "en esta página".
 *     Precedente del módulo: la cobertura de conexión de slice-05, que es de la página y lo dice.
 *  3. **No derivable** — no se dibuja. Las 3 de abajo (`INCIDENTES_*`, `TABS_*`, mini-stats
 *     derivadas) están acá con su motivo, no ausentes en silencio.
 */

/* ══ 1. Lo que la Sala NO puede dibujar, y por qué ═════════════════════════════════════════════ */

/**
 * ⚠️ **NO EXISTE EL CONCEPTO DE INCIDENTE / CLUSTER EN EL CONTRATO.**
 *
 * La ficha §4.1 pide 2 secciones colapsables en la cola —"Incidentes detectados" (cluster con hijos
 * expandibles) y "Problemas individuales"— y §3 pide una mini-stat "Incidentes". Verificado contra
 * el contrato y contra el C# que corre: `grep -i "incidente\|cluster"` sobre
 * `services/contracts/flota.ts`, sobre `Flota.Application/DTOs/ProblemaDtos.cs` y sobre
 * `00-contrato/dtos.ts` da **0 hits**. `ProblemaOperativoListItemDto` no tiene `incidenteId`, ni
 * `esCluster`, ni `problemasAgrupados`, ni nada que permita saber que dos filas pertenecen al mismo
 * incidente.
 *
 * Lo único que agrupa en el modelo es la **deduplicación por `(tipo, vehículo)`**, y eso produce
 * **un** problema con más señales (`senalesCount`), no un cluster de problemas.
 *
 * ⇒ La cola es **una sola lista**, en el orden del backend. Inventar el agrupamiento por
 * proximidad temporal + regla (que es lo que el mockup dibuja) sería fabricar del lado del cliente
 * una correlación que el motor no hizo: dos GPS que fallan a la misma hora **no** son
 * necesariamente el mismo incidente, y presentarlos como uno le diría al operador que ya sabe la
 * causa.
 *
 * **PENDIENTE**: el cluster es del backend (correlación) o del contrato (campo). Decide el PO.
 */
export const INCIDENTES_AGRUPADOS_DISPONIBLES = false

/**
 * ⚠️ **Los tabs Abiertos / Resueltos de la cola NO se dibujan** (ficha §4.1).
 *
 * `GET /problemas` no acepta filtro de estado (B-17) y el orden es prioridad DESC, así que abiertos
 * y cerrados llegan **entremezclados** en la misma página. Un tab "Resueltos" que filtre la página
 * cargada mostraría los resueltos **que casualmente cayeron en esta página**, y el usuario leería
 * eso como "estos son mis problemas resueltos". Es exactamente la trampa de D-S3-33 —el chip que se
 * manda y no filtra— con otra forma.
 *
 * ⇒ La cola muestra lo que devolvió el servidor, cada fila con su badge de estado, y **lo dice** en
 * el encabezado (`centro.sala.cola.aclaracionSinFiltros`). El día que B-17 cierre, esto pasa a
 * `true` y los tabs mandan el filtro real.
 */
export const TABS_DE_LA_COLA_DISPONIBLES = false

/**
 * El vacío de la bandeja. **UNO solo, y no afirma ninguna causa.**
 *
 * ── POR QUE ESTO ERA UNA MENTIRA HASTA EL CIERRE DE SLICE-06 ──────────────────────────────────
 * Acá había un flag `DETECCION_DE_PROBLEMAS_CONECTADA = false` que elegía entre dos copys, y el que
 * salía siempre afirmaba *"**ninguna regla está activa en tu organización**"*. Esta pantalla **no
 * consulta reglas** —no llama a `GET /problemas/reglas` ni sabe cuántas hay— así que esa frase es
 * una afirmación sobre datos que nunca miró. Y es **falsificable por el usuario en 30 segundos**:
 * `f-10` construyó el alta de reglas, `ReglasProblemasController` está enrutado, el modal crea y
 * activa, y `IngestaUpstreamService` **no** está bloqueado por GATE 2 en el camino de señales
 * (el gate corta `AbrirAlerta`, no `IngestarSenal`). O sea: el usuario crea una regla, la ve
 * listada en Reglas, vuelve al Centro y lee que no tiene ninguna.
 *
 * Lo que **sí** es cierto y sobrevive: que la bandeja esté vacía no dice nada sobre la flota. Eso se
 * puede afirmar sin consultar nada, porque es el **mecanismo** (un problema se abre solo si una
 * regla activa lo detecta), no el estado de esta organización.
 *
 * ── POR QUE NO HAY UNA SEGUNDA RAMA ───────────────────────────────────────────────────────────
 * El copy de la ficha §9 —*"Sin problemas abiertos. Tu flota está tranquila."*— se borró con el
 * flag. Solo sería honesto si la pantalla pudiera saber que la detección corre de punta a punta, y
 * **ninguna superficie del contrato responde eso**: no hay endpoint de salud del motor ni campo que
 * lo diga. Dejarlo detrás de una constante escrita a mano era volver a decidirlo desde el
 * frontend. Vuelve el día que el contrato publique de dónde leerlo (PENDIENTE del PO).
 *
 * No hay "sin resultados": no hay filtros que limpiar (**B-17**).
 */
export function claveDelVacioDeLaBandeja(): string {
  return 'centro.problemas.vacioDeLaBandeja'
}

/* ══ 2. Paginación ════════════════════════════════════════════════════════════════════════════ */

/** Default de plataforma (`api.md` §Convenciones 3). Los "Mostrando 1-10" del mockup no son fuente. */
export const PAGE_SIZE_PROBLEMAS_DEFAULT = 20

/** Máximo 100 por el contrato de `PageQuery`; pedir más lo recorta el servidor en silencio. */
export const OPCIONES_TAMANO_PAGINA_PROBLEMAS = [10, PAGE_SIZE_PROBLEMAS_DEFAULT, 50, 100]

/**
 * ¿Lo que se ve es toda la organización, o una página de algo más grande?
 *
 * Decide si los derivados de la página se rotulan "en esta página" o alcanza con decir el número.
 * Con una sola página, "en esta página" y "en total" son el mismo conjunto y aclararlo es ruido.
 */
export function hayMasDeUnaPagina(pagination: PaginationMetadata | null | undefined): boolean {
  return pagination !== null && pagination !== undefined && pagination.totalPages > 1
}

/* ══ 3. Resumen de la página ══════════════════════════════════════════════════════════════════ */

/**
 * Los 3 conteos que **sí** se pueden derivar de la página cargada, y ninguno más.
 *
 * ── POR QUÉ NO SON LAS 5 MINI-STATS DE LA FICHA §3 ────────────────────────────────────────────
 * De las 5 tarjetas que pide la ficha (Abiertos · Críticos · Por vencer · Incidentes · Cerrados
 * hoy), **3 son imposibles de derivar sin mentir** y las 2 restantes solo valen sobre la página:
 *
 *  - **Por vencer** — `sla.estado = 'por_vencer'` **nunca se emite**: ningún documento fija el
 *    umbral (`EstadoSlaDerivado` solo devuelve `vigente`/`vencido`/`sin_sla`). La tarjeta mostraría
 *    **0 siempre**, que se lee como "no tenés ninguno por vencer" — una afirmación falsa sobre el
 *    estado de la flota. En su lugar se cuenta **`vencido`**, que sí se emite.
 *  - **Incidentes** — no existe el concepto en el contrato (ver `INCIDENTES_AGRUPADOS_DISPONIBLES`).
 *  - **Cerrados hoy + MTTR** — el MTTR es PENDIENTE DA-PC-01, y "cerrados hoy" exigiría filtrar por
 *    fecha y estado sobre **toda** la organización: sin filtros de servidor, contar los terminales
 *    de la página daría un número que cambia al paginar y que no es el de la organización.
 *
 * Y los "hints" de las 5 tarjetas (*sin tocar*, *sin responsable*, *escalado*, *problemas
 * agrupados*, *MTTR*) son **todos** DA-PC-01 salvo `sin responsable`, que sí sale del DTO.
 *
 * ⇒ Se devuelve lo derivable, y la pantalla lo rotula como de la página. Un número honesto y chico
 * es mejor que 5 tarjetas en `—`, que es lo que parece una pantalla rota.
 */
export interface ResumenDeLaPagina {
  readonly enPagina: number
  readonly criticos: number
  /** `sla.estado === 'vencido'`. **No** es "por vencer": ese estado no se emite nunca. */
  readonly plazoVencido: number
  readonly sinResponsable: number
}

export function resumenDeLaPagina(
  items: readonly ProblemaOperativoListItemDto[],
): ResumenDeLaPagina {
  let criticos = 0
  let plazoVencido = 0
  let sinResponsable = 0

  for (const item of items) {
    if (item.severidad === 'critica') criticos += 1
    if (item.sla.estado === 'vencido') plazoVencido += 1
    if (item.responsable === null) sinResponsable += 1
  }

  return { enPagina: items.length, criticos, plazoVencido, sinResponsable }
}

/* ══ 4. Panel de contexto ═════════════════════════════════════════════════════════════════════ */

/**
 * Otros problemas del MISMO vehículo, **entre los de la página cargada**.
 *
 * La ficha §2 pide "otros problemas del vehículo" en el panel de contexto. No hay endpoint que los
 * traiga (`GET /problemas` no filtra por vehículo, B-17), así que lo único derivable es la
 * intersección con lo que ya llegó. Se devuelve tal cual y **la pantalla lo rotula**: decir "este
 * vehículo tiene 2 problemas más" cuando en realidad tiene 7 y 5 están en la página 3 sería una
 * afirmación falsa sobre el vehículo.
 *
 * Un problema sin vehículo (`vehiculo === null`, legal: hay tipos que cuelgan del conductor) no
 * tiene con qué emparejar y devuelve lista vacía — nunca se agrupa "los que no tienen vehículo".
 */
export function otrosProblemasDelMismoVehiculo(
  items: readonly ProblemaOperativoListItemDto[],
  seleccionado: ProblemaOperativoListItemDto | null | undefined,
): ProblemaOperativoListItemDto[] {
  const vehiculoId = seleccionado?.vehiculo?.vehiculoFlotaId
  if (vehiculoId === undefined) return []

  return items.filter(
    (item) => item.id !== seleccionado?.id && item.vehiculo?.vehiculoFlotaId === vehiculoId,
  )
}

/* ══ 5. Identidad del vehículo del problema ═══════════════════════════════════════════════════ */

/**
 * Patente legible del vehículo del problema.
 *
 * ⚠️ `ProblemaVehiculoDto.patente` puede ser el **string vacío**, no `null`: el C# escribe
 * `string.Empty` cuando la proyección canónica no la trae. Un `patente ?? '—'` deja la celda **en
 * blanco** (el `??` solo cubre `null`/`undefined`), que es el bug silencioso de este DTO. Se
 * chequea el vacío explícitamente.
 *
 * Devuelve `null` cuando no hay patente: quien llama imprime su marcador de dato ausente. No se
 * cae al id interno — pintar un GUID donde va una patente ya se corrigió una vez (D-S4F-8).
 */
export function patenteDelProblema(vehiculo: ProblemaVehiculoDto | null): string | null {
  if (vehiculo === null) return null
  const patente = vehiculo.patente.trim()
  return patente === '' ? null : patente
}

/** Marca + modelo de la proyección local. Mismo tratamiento del vacío que la patente. */
export function descripcionDelVehiculo(vehiculo: ProblemaVehiculoDto | null): string | null {
  if (vehiculo === null) return null
  const descripcion = vehiculo.descripcion.trim()
  return descripcion === '' ? null : descripcion
}

/* ══ 6. El reloj de SLA, listo para pintar ════════════════════════════════════════════════════ */

/**
 * Cómo se lee el SLA de un problema.
 *
 * Son 4 formas distintas y **no son intercambiables**:
 *  - `sin_plazo` — el problema **no tiene reloj**. No es "a tiempo": nadie está midiendo cuánto
 *    tarda. Pintarlo como éxito sería la mentira fácil de esta pantalla.
 *  - `vencido` — pasó el plazo. `minutosRestantes` viene **negativo** (`RelojSla.MinutosRestantes`
 *    no lo recorta), así que se muestra su valor absoluto como "vencido hace N".
 *  - `en_plazo` — quedan N minutos.
 *  - `sin_dato` — el estado dice que hay reloj pero no llegó el número. No se inventa un cero.
 */
export type LecturaDeSla =
  | { readonly forma: 'sin_plazo' }
  | { readonly forma: 'vencido'; readonly minutos: number }
  | { readonly forma: 'en_plazo'; readonly minutos: number }
  | { readonly forma: 'sin_dato' }

export function lecturaDeSla(sla: ProblemaSlaDto): LecturaDeSla {
  if (sla.estado === 'sin_sla') return { forma: 'sin_plazo' }
  if (sla.minutosRestantes === null) return { forma: 'sin_dato' }

  return sla.estado === 'vencido'
    ? { forma: 'vencido', minutos: Math.abs(sla.minutosRestantes) }
    : { forma: 'en_plazo', minutos: sla.minutosRestantes }
}

/* ══ 7. La barra de acciones del panel de detalle ═════════════════════════════════════════════ */

/**
 * Por qué una acción del problema **no se puede ejecutar**, más allá del permiso.
 *
 * `null` = no hay bloqueo de contrato; lo único que puede faltar es el permiso, y eso lo resuelve
 * la pantalla con su tooltip.
 *
 *  - `asignar` → **DA-PC-07**: `AsignarProblemaRequest.responsableUsuarioId` es un id de usuario y
 *    **no existe endpoint de catálogo de asignables** (`api.md` §Catálogos no lo tiene). El selector
 *    no tiene de dónde alimentarse y listar usuarios desde otra superficie está prohibido. El botón
 *    va **deshabilitado con el motivo visible**, no oculto: la capacidad existe del lado del
 *    servidor y el usuario tiene que poder entender por qué no la puede usar.
 *  - `ver_mapa` / `ver_vehiculo` → navegación pura, nunca bloqueada por contrato.
 *  - `silenciar` / `resolver` → construidas y completas.
 */
export function motivoDeBloqueoDeAccion(accion: AccionProblema): string | null {
  return accion === 'asignar' ? 'centro.sala.acciones.asignarBloqueado' : null
}

/**
 * ¿La acción se ejecuta acá, o navega a otra pantalla?
 *
 * `accionesDisponibles` las **deriva el servidor** del estado del problema (terminal ⇒ solo las 2 de
 * navegación), así que la pantalla no recalcula si un problema cerrado admite resolver: lee la
 * lista. Lo que sí decide acá es dónde va cada botón.
 */
export function esAccionDeNavegacion(accion: AccionProblema): boolean {
  return accion === 'ver_mapa' || accion === 'ver_vehiculo'
}

/** Permiso que gatea cada acción (`permisos.md` §grupo problemas). El de navegación es de otro grupo. */
const PERMISO_POR_ACCION: Record<AccionProblema, string> = {
  asignar: 'flota.problemas.asignar',
  silenciar: 'flota.problemas.silenciar',
  resolver: 'flota.problemas.resolver',
  ver_mapa: 'flota.vehiculos.leer',
  ver_vehiculo: 'flota.vehiculos.leer',
}

export function permisoDeAccion(accion: AccionProblema): string {
  return PERMISO_POR_ACCION[accion]
}

/* ══ 8. Ventanas de silencio ══════════════════════════════════════════════════════════════════ */

/**
 * Las ventanas que el modal de Silenciar ofrece.
 *
 * ⚠️ **Son 2 de las 3 de la ficha §6, y la que falta no es un olvido.** La ficha ofrece
 * "30 minutos · 2 horas · **Hasta fin de turno**", y `SilenciarProblemaRequest` viaja con un
 * `silenciarHastaUtc` absoluto, así que la UI tiene que **calcular** ese instante. **Ningún
 * documento del contrato define cuándo termina un turno**: no hay jornada, ni horario de la
 * organización, ni campo de turno en ninguna tabla (`grep -in "ventana\|horaria"` sobre `ddl.sql`
 * = 0, y es el mismo hueco por el que `horario_no_permitido` no tiene fuente). Elegir 8 horas, o
 * las 18:00, sería inventar la regla operativa de la organización.
 *
 * **PENDIENTE**: definir "fin de turno" (jornada de la organización). Decide el PO.
 */
export const VENTANAS_DE_SILENCIO_MINUTOS = [30, 120] as const

export type VentanaDeSilencioMinutos = (typeof VENTANAS_DE_SILENCIO_MINUTOS)[number]

/**
 * El `silenciarHastaUtc` que viaja en el request.
 *
 * El silencio **arranca ahora** (el request solo trae el `hasta`), así que el instante se calcula
 * contra el reloj del cliente. `ahoraMs` entra por parámetro y no se lee `Date.now()` acá: la
 * función tiene que ser pura para poder anclarla, y el reloj impuro en render lo rechaza el lint.
 */
export function silenciarHastaUtc(ahoraMs: number, minutos: number): string {
  return new Date(ahoraMs + minutos * 60_000).toISOString()
}
