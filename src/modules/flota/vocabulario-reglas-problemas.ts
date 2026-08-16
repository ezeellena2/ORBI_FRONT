import type {
  CampoCondicionRegla,
  CondicionItemJsonDto,
  CondicionReglaJsonDto,
  MotivoCondicionInvalida,
  OperadorCondicionRegla,
  PaginationMetadata,
  ReglaProblemaDto,
  SeveridadProblema,
} from '@/services/contracts/flota'

/**
 * Vocabulario de la pantalla de REGLAS del motor (`f-10`).
 *
 * Tiene 3 responsabilidades y ninguna es de presentacion:
 *  1. **espejar la gramatica del DSL v1** para que el editor solo pueda producir shapes validos;
 *  2. **validar en cliente** las mismas 9 causas que el backend, en el MISMO orden, para que el
 *     usuario no descubra un error de forma despues de un round-trip;
 *  3. decir **que puede afirmar el resumen operativo** cuando el listado esta paginado.
 *
 * ══ POR QUE SE DUPLICA LA GRAMATICA ══════════════════════════════════════════════════════════════
 * `GramaticaDsl.cs` es la fuente de verdad y este archivo es su espejo, igual que
 * `services/contracts/flota.ts` espeja los DTOs. No es opcional: el editor tiene que **poder ofrecer
 * solo los operadores admitidos para el campo elegido**, y esa tabla no viaja por ningun endpoint
 * (no existe `GET /catalogos/campos-dsl`). La alternativa era un textarea de JSON libre, que es
 * exactamente lo que `f-10` paso 7 prohibe.
 *
 * ⚠️ Si `motor-de-reglas.md` §2.2/§2.3 crece, este archivo y `GramaticaDsl.cs` se tocan JUNTOS. El
 * test de este vocabulario ancla los 13 campos y los 7 operadores por conteo, asi que agregar uno de
 * un solo lado se pone rojo.
 *
 * ══ LO QUE ESTA PANTALLA NO PUEDE HACER, Y ESTA DECLARADO EN OTRO LADO ═══════════════════════════
 * El **alcance** de la regla (vehiculos / conductores / geozonas) y sus **destinatarios** no tienen
 * tabla puente (PENDIENTE #2): toda regla alcanza a toda la organizacion. Eso no vive aca sino en
 * `CAPACIDADES_BLOQUEADAS_DEL_CENTRO.alcanceDeRegla`, que es de donde sale el copy que el modal
 * muestra. Idem los **filtros** del listado (B-17).
 */

/* ══ 1. Plazo (SLA) ════════════════════════════════════════════════════════════════════════════ */

/**
 * SLA default por severidad — `motor-de-reglas.md` §4.1, **[default ratificable]**.
 *
 * ⚠️ Es la tabla que el backend **deberia** sembrar al activar el modulo, y hoy **no siembra nada**:
 * `FlotaActivacionSeedService` no existe y la tabla de configuracion por-organizacion no la nombra
 * ningun documento (PENDIENTE #4). O sea que estos 4 numeros son, hoy, **lo unico** que le propone
 * un plazo al usuario cuando crea una regla — y por eso el select los ofrece y el campo queda
 * editable, en vez de derivarse en silencio de la severidad.
 */
export const SLA_MINUTOS_POR_SEVERIDAD: Record<SeveridadProblema, number> = {
  critica: 15,
  alta: 60,
  media: 480,
  baja: 2880,
}

/**
 * Las opciones del select "Plazo objetivo", en orden creciente.
 *
 * Son **los 4 defaults de §4.1 y nada mas**: `f-10` paso 7 dice "opciones = SLA default por
 * severidad". Un input libre de minutos aceptaria valores que ningun documento respalda (el backend
 * solo acota `0 < slaMinutos <= 525.600`), y la regla del modulo es no inventar numeros de negocio.
 */
export const OPCIONES_DE_PLAZO_MINUTOS: readonly number[] = [15, 60, 480, 2880] as const

/** Tope del backend (`CrearReglaProblemaRequestValidator.SlaMinutosMaximo`): 1 anio en minutos. */
export const SLA_MINUTOS_MAXIMO = 525_600

/**
 * Como se lee un plazo: `15 min` · `1 h` · `8 h` · `48 h` (`f-10` paso 3).
 *
 * Devuelve la clave i18n **con su cantidad** en vez de un string armado, porque "minuto"/"hora"
 * tienen plural y el plural lo elige i18next, no una concatenacion.
 *
 * ⚠️ Un valor que **no** es multiplo de 60 se muestra en minutos enteros (`90 min`), no como
 * `1 h 30`. Es deliberado: el select solo ofrece los 4 defaults, asi que el caso mixto solo aparece
 * con una regla creada por otra via, y partirlo en 2 unidades pediria decidir como se abrevia — que
 * ningun documento fija.
 */
export function formatoDePlazo(minutos: number): { clave: string; cantidad: number } {
  const enHoras = minutos >= 60 && minutos % 60 === 0
  return enHoras
    ? { clave: 'centro.reglas.plazo.horas', cantidad: minutos / 60 }
    : { clave: 'centro.reglas.plazo.minutos', cantidad: minutos }
}

/* ══ 2. Gramatica del DSL v1 (espejo de `GramaticaDsl.cs`) ═════════════════════════════════════ */

/** Tipo del `valor` que admite un campo (`motor-de-reglas.md` §2.2). */
export type TipoValorDsl = 'numero' | 'booleano' | 'texto'

export interface CampoDsl {
  readonly codigo: CampoCondicionRegla
  readonly tipo: TipoValorDsl
  readonly operadores: readonly OperadorCondicionRegla[]
}

/**
 * Los **13** campos del enum v1, en el orden de la tabla §2.2.
 *
 * ⚠️ Los 3 de geozona (`geozona_entrada`, `geozona_salida`, `minutos_en_geozona`) **no estan**:
 * DIFERIDO DA-08. Se agregan sin cambiar `version` el dia que la decision cierre.
 *
 * ⚠️ `mantenimiento_vencido` **si** esta en la gramatica y **nunca es `true`**: su emisor es el
 * servicio Operaciones, que no existe en `src/`. Una regla que lo use se guarda y no dispara nunca.
 * El editor lo ofrece igual —sacarlo del enum seria mentir sobre la gramatica— y la ayuda del campo
 * lo dice.
 */
export const CAMPOS_DSL: readonly CampoDsl[] = [
  { codigo: 'velocidad_kmh', tipo: 'numero', operadores: ['>', '>=', '==', 'sostenido_por'] },
  { codigo: 'ignicion', tipo: 'booleano', operadores: ['==', 'sostenido_por'] },
  { codigo: 'en_movimiento', tipo: 'booleano', operadores: ['==', 'sostenido_por'] },
  { codigo: 'minutos_sin_senal', tipo: 'numero', operadores: ['>', '>='] },
  { codigo: 'bateria_pct', tipo: 'numero', operadores: ['<', '<='] },
  { codigo: 'manipulacion_detectada', tipo: 'booleano', operadores: ['=='] },
  { codigo: 'dtc_criticidad', tipo: 'texto', operadores: ['==', 'in'] },
  { codigo: 'dtc_codigo', tipo: 'texto', operadores: ['==', 'in'] },
  { codigo: 'conductor_asignado', tipo: 'booleano', operadores: ['=='] },
  { codigo: 'dias_para_vencer', tipo: 'numero', operadores: ['<', '<=', '=='] },
  { codigo: 'documento_vencido', tipo: 'booleano', operadores: ['=='] },
  { codigo: 'vehiculo_incompleto', tipo: 'booleano', operadores: ['=='] },
  { codigo: 'mantenimiento_vencido', tipo: 'booleano', operadores: ['=='] },
] as const

/** Los 7 operadores del enum §2.3. El editor nunca ofrece uno fuera de `CampoDsl.operadores`. */
export const OPERADORES_DSL: readonly OperadorCondicionRegla[] = [
  '>',
  '>=',
  '<',
  '<=',
  '==',
  'in',
  'sostenido_por',
] as const

/** Cotas del shape v1 (`ShapeCondicion` del dominio). Las 3 son **[default ratificable]**. */
export const LIMITES_CONDICION = {
  minimoCondiciones: 1,
  maximoCondiciones: 10,
  minimoElementosIn: 1,
  maximoElementosIn: 50,
} as const

export const VERSION_DSL_SOPORTADA = 1
export const COMBINADOR_DSL = 'and'

/**
 * Los 4 valores que `motor-de-reglas.md` §2.2 declara para `dtc_criticidad`.
 *
 * ⚠️ **El backend NO los valida**: `ValidadorCondicion` solo exige que el valor sea texto. El editor
 * los ofrece como select porque el contrato los enumera, y quien tipee otro codigo por otra via no
 * recibe error — la regla simplemente no matchea nunca. Se declara para que nadie lo lea como
 * garantia del server.
 */
export const VALORES_DTC_CRITICIDAD: readonly string[] = ['baja', 'media', 'alta', 'critica'] as const

export function campoDsl(codigo: string): CampoDsl | null {
  return CAMPOS_DSL.find((campo) => campo.codigo === codigo) ?? null
}

export function operadoresAdmitidos(codigo: string): readonly OperadorCondicionRegla[] {
  return campoDsl(codigo)?.operadores ?? []
}

/* ══ 3. Validacion en cliente — las 9 causas, en el orden del backend ══════════════════════════ */

export interface VeredictoCondicion {
  readonly valida: boolean
  /** Posicion de la condicion ofensora. `null` en las 3 causas que no son de una condicion. */
  readonly indice: number | null
  readonly motivo: MotivoCondicionInvalida | null
}

const ACEPTADA: VeredictoCondicion = { valida: true, indice: null, motivo: null }

function rechazar(motivo: MotivoCondicionInvalida, indice: number | null = null): VeredictoCondicion {
  return { valida: false, indice, motivo }
}

/**
 * Valida `condicion_json` con **las mismas 9 causas y el mismo orden** que
 * `Flota.Domain/Reglas/ValidadorCondicion.cs`.
 *
 * ── POR QUE SE VALIDA DOS VECES ───────────────────────────────────────────────────────────────
 * No es desconfianza del backend: es que el error del backend llega **por condicion**
 * (`args {indice, motivo}`, en singular) y despues de un round-trip. Validar acá deja el foco en la
 * fila ofensora **mientras el usuario la esta editando**. El servidor sigue siendo el que decide: si
 * los dos difieren, gana el 400 y se muestra tal cual.
 *
 * ⚠️ **El orden importa y no es cosmetico**: `umbral_minutos` se evalua ANTES que el tipo de valor,
 * igual que en el dominio. Una condicion con `sostenido_por` y sin umbral es invalida por la causa 7
 * y no por la 6, y si el cliente dijera lo contrario, el mensaje cambiaria al llegar al server.
 *
 * Devuelve el **primer** incumplimiento, como el backend: `errores.md` declara `args` en singular.
 */
export function validarCondicionEnCliente(
  condicion: CondicionReglaJsonDto | null | undefined,
): VeredictoCondicion {
  if (condicion === null || condicion === undefined) return rechazar('json_no_parseable')
  if (condicion.version !== VERSION_DSL_SOPORTADA) return rechazar('version_no_soportada')
  if (condicion.combinador !== COMBINADOR_DSL) return rechazar('combinador_no_soportado')

  const cantidad = condicion.condiciones.length
  const cantidadValida =
    cantidad >= LIMITES_CONDICION.minimoCondiciones && cantidad <= LIMITES_CONDICION.maximoCondiciones
  if (!cantidadValida) return rechazar('cantidad_de_condiciones_invalida')

  for (let indice = 0; indice < condicion.condiciones.length; indice += 1) {
    const veredicto = validarItem(condicion.condiciones[indice], indice)
    if (!veredicto.valida) return veredicto
  }

  return ACEPTADA
}

function validarItem(item: CondicionItemJsonDto, indice: number): VeredictoCondicion {
  const campo = campoDsl(item.campo)
  if (campo === null) return rechazar('campo_desconocido', indice)

  const operadorConocido = (OPERADORES_DSL as readonly string[]).includes(item.operador)
  const admitido = (campo.operadores as readonly string[]).includes(item.operador)
  if (!operadorConocido || !admitido) return rechazar('operador_no_admitido', indice)

  // Causa 7 ANTES que la 6, igual que el dominio.
  const esSostenidoPor = item.operador === 'sostenido_por'
  const umbral = item.umbral_minutos
  const umbralValido = esSostenidoPor
    ? typeof umbral === 'number' && umbral > 0
    : umbral === null || umbral === undefined
  if (!umbralValido) return rechazar('umbral_minutos_invalido', indice)

  if (!tipoDeValorCompatible(campo, item)) return rechazar('tipo_de_valor_incompatible', indice)
  if (!listaInValida(item)) return rechazar('lista_in_invalida', indice)

  return ACEPTADA
}

/**
 * Causa 6 — tipo de `valor` contra el par campo+operador (§2.3):
 *  - `in` -> `string[]`, y solo lo admiten campos de texto;
 *  - `>` / `>=` / `<` / `<=` -> number;
 *  - `==` -> el tipo del campo;
 *  - `sostenido_por` -> number o boolean, segun el tipo del campo.
 */
function tipoDeValorCompatible(campo: CampoDsl, item: CondicionItemJsonDto): boolean {
  if (item.operador === 'in') return campo.tipo === 'texto' && Array.isArray(item.valor)
  if (Array.isArray(item.valor)) return false

  const comparadores: readonly string[] = ['>', '>=', '<', '<=']
  if (comparadores.includes(item.operador)) return typeof item.valor === 'number'

  if (campo.tipo === 'numero') return typeof item.valor === 'number'
  if (campo.tipo === 'booleano') return typeof item.valor === 'boolean'
  return typeof item.valor === 'string'
}

/** Causa 8 — `in` con array vacio, con mas de 50 elementos, o con duplicados. */
function listaInValida(item: CondicionItemJsonDto): boolean {
  if (item.operador !== 'in') return true
  if (!Array.isArray(item.valor)) return false

  const elementos = item.valor
  const dentroDeRango =
    elementos.length >= LIMITES_CONDICION.minimoElementosIn &&
    elementos.length <= LIMITES_CONDICION.maximoElementosIn

  return dentroDeRango && new Set(elementos).size === elementos.length
}

/* ══ 4. Claves i18n armadas por concatenacion (las ancla `vocabularios-i18n.test.ts`) ══════════ */

export function claveDeCampoDsl(campo: CampoCondicionRegla): string {
  return `centro.reglas.campo.${campo}`
}

/** La linea que dice de donde sale la senal y, en 2 casos, que hoy no llega ninguna. */
export function claveDeAyudaDeCampoDsl(campo: CampoCondicionRegla): string {
  return `centro.reglas.campoAyuda.${campo}`
}

/**
 * Etiqueta del operador. **No se pinta el simbolo crudo**: `>=` es legible para quien escribe SQL y
 * ambiguo para un supervisor de flota, y `sostenido_por` no tiene simbolo.
 */
export function claveDeOperadorDsl(operador: OperadorCondicionRegla): string {
  const CODIGOS: Record<OperadorCondicionRegla, string> = {
    '>': 'mayor',
    '>=': 'mayorIgual',
    '<': 'menor',
    '<=': 'menorIgual',
    '==': 'igual',
    in: 'en',
    sostenido_por: 'sostenidoPor',
  }
  return `centro.reglas.operador.${CODIGOS[operador]}`
}

export function claveDeAccionDeRegla(accion: AccionDeRegla): string {
  return `centro.reglas.accion.${accion}`
}

/* ══ 5. Resumen operativo — que puede afirmar con un listado paginado ══════════════════════════ */

/**
 * Los 4 contadores de `f-10` paso 4 / ficha §3, calculados sobre **lo que llego**.
 *
 * ── EL PROBLEMA QUE ESTA FUNCION RESUELVE ─────────────────────────────────────────────────────
 * La ficha pide "COUNT reglas `activa=true` **de la org**", y **no existe endpoint agregado**: es la
 * misma clase de hueco que **B-35** dejo en los 3 listados de slice-05, donde la decision fue **no
 * dibujar** los contadores porque derivarlos de la pagina da un numero que cambia al paginar.
 *
 * Aca se puede algo mejor que en aquel caso, y por un hecho medible: **si el listado entra en una
 * sola pagina, la pagina ES la organizacion**. Entonces:
 *  - `totalPaginas <= 1` -> los contadores son de la organizacion y no llevan aclaracion;
 *  - `totalPaginas > 1`  -> son de la pagina cargada, y `esDeLaPagina` lo enciende para que la UI lo
 *    diga. **No se ocultan**: un supervisor que ve 2 de 30 reglas criticas prefiere el numero
 *    rotulado a ningun numero.
 *
 * ⚠️ **`activaciones` no se calcula y no es 0**: `ultimasActivacionesCount` viaja en 0 SIEMPRE
 * (no existe el vinculo problema -> regla, PENDIENTE #8) y la ventana de 24 h es **DA-PR-04
 * abierta**. Sumar ceros daria "0 activaciones en 24 h", que es una afirmacion sobre el motor que
 * nadie verifico. Va en `—`.
 */
export interface ResumenDeReglas {
  readonly activas: number
  readonly criticas: number
  readonly conWebhook: number
  readonly total: number
  /** `true` = los 3 contadores son de la pagina cargada, no de la organizacion. */
  readonly esDeLaPagina: boolean
}

export function resumenDeReglas(
  reglas: readonly ReglaProblemaDto[],
  paginacion: PaginationMetadata | null | undefined,
): ResumenDeReglas {
  const activas = reglas.filter((regla) => regla.activa)

  return {
    activas: activas.length,
    criticas: activas.filter((regla) => regla.severidadBase === 'critica').length,
    conWebhook: reglas.filter((regla) => regla.webhookEndpointId !== null).length,
    total: paginacion?.totalItems ?? reglas.length,
    esDeLaPagina: (paginacion?.totalPages ?? 1) > 1,
  }
}

/* ══ 6. Acciones de fila ══════════════════════════════════════════════════════════════════════ */

/**
 * Lo que el kebab de una regla puede ofrecer.
 *
 * ── LAS 4 QUE NO ESTAN, Y POR QUE ─────────────────────────────────────────────────────────────
 *  - **Ver activaciones** y **Probar regla**: `api.md` §Reglas declara **3 filas** y ninguna es
 *    esta. Sin endpoint no hay ruta, y resolverlas client-side esta prohibido (`f-10` paso 6).
 *  - **Ver geozonas**: DIFERIDO DA-08. No hay una sola linea de logica de geozona en la solucion.
 *  - **Eliminar**: no existe `DELETE` de regla (DA-PR-03) y no es un olvido — una regla borrada
 *    dejaria problemas huerfanos de su origen. La baja operativa **es** pausar.
 *
 * ── LA QUE SE PLEGO ───────────────────────────────────────────────────────────────────────────
 * `f-10` paso 6 lista **"Agregar webhook"** como item propio. Es el **mismo `PATCH` y el mismo
 * campo** que ya tiene el modal de edicion: un item aparte abre la misma pantalla por otra puerta y
 * duplica el gate de `flota.integraciones.leer`. Se pliega en **Editar**, y la columna Webhook de la
 * tabla es la que hace visible cuales no tienen. Desviacion declarada.
 */
export const ACCIONES_DE_REGLA = ['editar', 'duplicar', 'pausar', 'activar', 'probarWebhook', 'verConductores'] as const

export type AccionDeRegla = (typeof ACCIONES_DE_REGLA)[number]

/**
 * Que acciones aplican a una regla concreta.
 *
 * `pausar` y `activar` son **mutuamente excluyentes** segun `activa`; `probarWebhook` solo aparece
 * con `webhookEndpointId`; `verConductores` solo en reglas de tipo `conductor` (`f-10` paso 6).
 *
 * Devuelve **que aplica**, no **que esta habilitado**: el permiso lo resuelve la UI, porque el
 * contrato manda mostrar la accion **deshabilitada con su motivo** y no ocultarla.
 */
export function accionesDeRegla(regla: ReglaProblemaDto): readonly AccionDeRegla[] {
  const acciones: AccionDeRegla[] = ['editar', 'duplicar']

  acciones.push(regla.activa ? 'pausar' : 'activar')
  if (regla.webhookEndpointId !== null) acciones.push('probarWebhook')
  if (regla.tipo === 'conductor') acciones.push('verConductores')

  return acciones
}

/**
 * Nombre de la copia al duplicar.
 *
 * Sale de `f-10` paso 6 (`"… (copia)"`) y se recorta al maximo del backend (200), porque duplicar
 * una regla con nombre largo generaria un 400 `validation.nombre.max_length` que el usuario no
 * pidio. Se recorta el nombre, **nunca el sufijo**: sin el, la copia y el original son
 * indistinguibles en la tabla.
 */
export const NOMBRE_LARGO_MAXIMO = 200

export function nombreDeLaCopia(nombre: string, sufijo: string): string {
  const disponible = NOMBRE_LARGO_MAXIMO - sufijo.length
  const base = nombre.length > disponible ? nombre.slice(0, Math.max(0, disponible)) : nombre
  return `${base}${sufijo}`
}
