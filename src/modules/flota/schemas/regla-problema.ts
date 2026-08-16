import { z } from 'zod'
import type {
  ActualizarReglaProblemaRequest,
  CondicionItemJsonDto,
  CondicionReglaJsonDto,
  CrearReglaProblemaRequest,
  ReglaProblemaDto,
} from '@/services/contracts/flota'
import { SEVERIDADES_PROBLEMA, TIPOS_REGLA_PROBLEMA } from '../vocabulario-centro-problemas'
import {
  COMBINADOR_DSL,
  NOMBRE_LARGO_MAXIMO,
  SLA_MINUTOS_MAXIMO,
  VERSION_DSL_SOPORTADA,
  campoDsl,
} from '../vocabulario-reglas-problemas'

/**
 * Schema del modal unico crear/editar de REGLA — `POST` / `PATCH /api/flota/problemas/reglas`.
 *
 * Los mensajes de Zod son los **mismos `WithErrorCode`** que emite
 * `CrearReglaProblemaRequestValidator` (`validation.nombre.required`,
 * `validation.accion_sugerida.max_length`, …), asi que el error local y el 400 del backend resuelven
 * la misma clave i18n y el usuario lee el mismo texto por los dos caminos.
 *
 * ══ LA CONDICION NO SE VALIDA CON ZOD, Y ES DELIBERADO ══════════════════════════════════════════
 * El DSL tiene **9 causas con `args {indice, motivo}`** y su copy ya existe en
 * `condicionInvalida.motivo.*` — el mismo que resuelve el 400 `flota.regla.condicion_invalida`. Un
 * mensaje de Zod es un string plano: no puede llevar el indice de la fila ofensora, asi que
 * meterlo ahi obligaria a escribir un **segundo** juego de mensajes para lo mismo. Por eso la
 * condicion se arma con `aCondicionJson` (funcion total) y se valida con
 * `validarCondicionEnCliente`, que devuelve **el mismo veredicto que el dominio**.
 *
 * ══ EL FORMULARIO GUARDA STRINGS Y EL DSL TIPOS ═════════════════════════════════════════════════
 * `condiciones[].valor` es polimorfico (`number | boolean | string | string[]`) y un `<input>`
 * devuelve string. En vez de 4 campos por fila —uno por tipo, con 3 siempre muertos— la fila guarda
 * **un** `valor: string` y `aCondicionJson` lo interpreta segun `campo` + `operador`.
 *
 * ⚠️ **La conversion NUNCA lanza ni "arregla" un valor invalido**: si el campo es numerico y el
 * usuario tipeo `abc`, el item sale con `valor: 'abc'` (string) y el validador lo rechaza con
 * `tipo_de_valor_incompatible`, que es exactamente lo que diria el backend. Convertirlo a `0` seria
 * guardar una regla que el usuario no escribio.
 */

/** Fila del editor de condicion, en la forma que la maneja el formulario (todo string). */
export const filaCondicionSchema = z.object({
  campo: z.string().min(1, 'validation.condicion_json.required'),
  operador: z.string().min(1, 'validation.condicion_json.required'),
  /** Se interpreta segun `campo` + `operador`. Para `in`, valores separados por coma. */
  valor: z.string(),
  /** Solo se usa con `sostenido_por`; vacio en cualquier otro operador. */
  umbralMinutos: z.string(),
})

export type FilaCondicionFormulario = z.infer<typeof filaCondicionSchema>

export const reglaProblemaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'validation.nombre.required')
    .max(NOMBRE_LARGO_MAXIMO, 'validation.nombre.max_length'),
  tipo: z.enum(TIPOS_REGLA_PROBLEMA),
  severidadBase: z.enum(SEVERIDADES_PROBLEMA),
  slaMinutos: z
    .number()
    .int()
    .positive('validation.sla_minutos.invalid')
    .max(SLA_MINUTOS_MAXIMO, 'validation.sla_minutos.max'),
  accionSugerida: z
    .string()
    .trim()
    .min(1, 'validation.accion_sugerida.required')
    .max(500, 'validation.accion_sugerida.max_length'),
  /** `''` = "Sin webhook". Ver `intentaDesvincularWebhook` antes de mandarlo en un `PATCH`. */
  webhookEndpointId: z.string(),
  activa: z.boolean(),
  condiciones: z.array(filaCondicionSchema).min(1, 'validation.condicion_json.required'),
})

export type ReglaProblemaFormulario = z.infer<typeof reglaProblemaSchema>

/**
 * Fila inicial del editor.
 *
 * Arranca en `minutos_sin_senal >= ` porque es el unico campo del enum cuya senal **existe hoy y
 * llega por push** (`telemetria.vehiculo-sin-conexion.v1`); empezar en `mantenimiento_vencido`
 * —que nunca es `true` porque Operaciones no existe— dejaria al usuario armando una regla muerta sin
 * saberlo. El `valor` va **vacio a proposito**: sugerir un umbral seria inventar el numero que el
 * seed de `motor-de-reglas.md` §7 declara PENDIENTE.
 */
export const FILA_CONDICION_INICIAL: FilaCondicionFormulario = {
  campo: 'minutos_sin_senal',
  operador: '>=',
  valor: '',
  umbralMinutos: '',
}

export const VALORES_INICIALES_REGLA: ReglaProblemaFormulario = {
  nombre: '',
  tipo: 'telemetria',
  severidadBase: 'media',
  // El default de `media` en §4.1. Se recalcula al cambiar la severidad, y queda editable.
  slaMinutos: 480,
  accionSugerida: '',
  webhookEndpointId: '',
  activa: true,
  condiciones: [FILA_CONDICION_INICIAL],
}

/* ══ Formulario -> DSL ═════════════════════════════════════════════════════════════════════════ */

const SEPARADOR_LISTA_IN = ','

/**
 * Convierte una fila del formulario en un item del DSL. **Funcion total**: nunca lanza y nunca
 * corrige — un valor que no encaja sale como el string crudo y lo rechaza el validador con el mismo
 * motivo que usaria el backend.
 *
 * ⚠️ `umbral_minutos` se incluye **solo** con `sostenido_por`. La causa "presente sin
 * `sostenido_por`" queda entonces **inalcanzable desde esta UI**, y esta bien: el editor esconde el
 * control al cambiar de operador. Se sigue validando porque la condicion puede llegar de una regla
 * creada por otra via.
 */
export function aItemDeCondicion(fila: FilaCondicionFormulario): CondicionItemJsonDto {
  const definicion = campoDsl(fila.campo)
  const base = {
    campo: fila.campo,
    operador: fila.operador,
  } as Pick<CondicionItemJsonDto, 'campo' | 'operador'>

  if (fila.operador === 'sostenido_por') {
    const umbral = Number.parseInt(fila.umbralMinutos, 10)
    const item = { ...base, valor: valorTipado(definicion?.tipo, fila.valor) }

    /*
      ⚠️ Un umbral que no parsea sale AUSENTE, no como `0`. Emitir `0` era corregir —el defecto que
      el docblock de arriba dice que esta funcion no comete— y encima con un valor que el usuario no
      escribio. Hoy el desenlace no cambia (el validador exige `> 0`, asi que las 2 formas dan
      `umbral_minutos_invalido`), pero si `0` alguna vez significara "sin umbral" se guardaria una
      regla que nadie escribio. Ausente es lo unico que describe lo que pasó: no hay umbral.
    */
    return Number.isFinite(umbral) ? { ...item, umbral_minutos: umbral } : item
  }

  if (fila.operador === 'in') {
    return { ...base, valor: aListaIn(fila.valor) }
  }

  const comparadores = ['>', '>=', '<', '<=']
  const tipo = comparadores.includes(fila.operador) ? 'numero' : definicion?.tipo
  return { ...base, valor: valorTipado(tipo, fila.valor) }
}

/**
 * ⚠️ **Los elementos vacios se descartan y los repetidos NO**: "P0300, , P0300" produce
 * `['P0300','P0300']`, que el validador rechaza con `lista_in_invalida`. Deduplicar en silencio
 * guardaria una lista distinta de la que el usuario escribio, y el mensaje que corresponde es
 * "sin repetidos", no una correccion muda.
 */
function aListaIn(valor: string): string[] {
  return valor
    .split(SEPARADOR_LISTA_IN)
    .map((elemento) => elemento.trim())
    .filter((elemento) => elemento.length > 0)
}

function valorTipado(
  tipo: 'numero' | 'booleano' | 'texto' | undefined,
  valor: string,
): number | boolean | string {
  if (tipo === 'numero') {
    const numero = Number(valor.trim())
    return valor.trim().length > 0 && Number.isFinite(numero) ? numero : valor
  }

  if (tipo === 'booleano') {
    if (valor === 'true') return true
    if (valor === 'false') return false
    return valor
  }

  return valor.trim()
}

export function aCondicionJson(filas: readonly FilaCondicionFormulario[]): CondicionReglaJsonDto {
  return {
    version: VERSION_DSL_SOPORTADA,
    combinador: COMBINADOR_DSL,
    condiciones: filas.map(aItemDeCondicion),
  }
}

/* ══ Formulario -> request ═════════════════════════════════════════════════════════════════════ */

/**
 * Alta.
 *
 * ⚠️ **No manda alcance ni destinatarios**, y el request ni siquiera los declara (PENDIENTE #2): la
 * regla creada alcanza a **toda la organizacion**. El modal lo dice con palabras; mandar arrays
 * vacios "por las dudas" seria el filtro que no filtra que D-S3-33 corrigio.
 *
 * ⚠️ Tampoco manda `ventanaHoraria` ni `ventanaSilencioMinutos`: estan en el request y **no tienen
 * control en el mockup ni definicion en la ficha** (PENDIENTE de `f-10` paso 7). Omitirlos deja al
 * backend con su default; inventarles un control seria decidir por el PO.
 */
export function aCrearReglaRequest(valores: ReglaProblemaFormulario): CrearReglaProblemaRequest {
  return {
    nombre: valores.nombre.trim(),
    tipo: valores.tipo,
    condicionJson: aCondicionJson(valores.condiciones),
    severidadBase: valores.severidadBase,
    activa: valores.activa,
    slaMinutos: valores.slaMinutos,
    accionSugerida: valores.accionSugerida.trim(),
    webhookEndpointId: valores.webhookEndpointId === '' ? undefined : valores.webhookEndpointId,
  }
}

/**
 * Edicion.
 *
 * `tipo` **no viaja**: el request no lo declara (DA-PR-08) y mandarlo seria un no-op silencioso.
 *
 * ⚠️ **`webhookEndpointId` se omite cuando el usuario elige "Sin webhook"** en vez de mandarse en
 * `null`. No es cosmetico: `null` **no desvincula** (B-18, el service preserva con `??`), asi que
 * mandarlo produciria un 200 que no hizo lo que el usuario pidio. Omitirlo produce el mismo
 * resultado del lado del server y deja que `intentaDesvincularWebhook` avise **antes** de guardar.
 */
export function aActualizarReglaRequest(
  valores: ReglaProblemaFormulario,
): ActualizarReglaProblemaRequest {
  return {
    nombre: valores.nombre.trim(),
    severidadBase: valores.severidadBase,
    condicionJson: aCondicionJson(valores.condiciones),
    slaMinutos: valores.slaMinutos,
    accionSugerida: valores.accionSugerida.trim(),
    activa: valores.activa,
    webhookEndpointId:
      valores.webhookEndpointId === '' ? undefined : valores.webhookEndpointId,
  }
}

/**
 * ¿El usuario esta intentando **quitar** el webhook de una regla que lo tenia?
 *
 * Es el unico campo de este formulario que cae en B-18, y el modo de falla es el mismo que
 * `AvisoCamposNoBorrables` cubre en vehiculos y dispositivos: el usuario elige "Sin webhook",
 * guarda, el modal cierra en verde y **la regla sigue con su webhook**. El aviso no bloquea el
 * submit —el resto de los cambios si se guardan— pero tiene que estar antes de apretar Guardar.
 */
export function intentaDesvincularWebhook(
  valores: ReglaProblemaFormulario,
  original: ReglaProblemaDto | null,
): boolean {
  if (original === null) return false
  return original.webhookEndpointId !== null && valores.webhookEndpointId === ''
}

/* ══ Regla existente -> formulario ═════════════════════════════════════════════════════════════ */

/**
 * Precarga del modal desde la fila (editar) o desde su clon (duplicar).
 *
 * ⚠️ Se lee **`condicionJson`, no `condicion`**: el string legible lo arma el server al leer y no es
 * parseable de vuelta. Una regla creada antes de esta pantalla, con un campo que la gramatica ya no
 * admita, se precarga igual y el editor la muestra tal cual — el validador la marca en su fila en
 * vez de silenciarla.
 */
export function aFormularioDeRegla(regla: ReglaProblemaDto): ReglaProblemaFormulario {
  return {
    nombre: regla.nombre,
    tipo: regla.tipo,
    severidadBase: regla.severidadBase,
    slaMinutos: regla.slaMinutos,
    accionSugerida: regla.accionSugerida,
    webhookEndpointId: regla.webhookEndpointId ?? '',
    activa: regla.activa,
    condiciones: regla.condicionJson.condiciones.map(aFilaDeCondicion),
  }
}

function aFilaDeCondicion(item: CondicionItemJsonDto): FilaCondicionFormulario {
  return {
    campo: item.campo,
    operador: item.operador,
    valor: Array.isArray(item.valor)
      ? item.valor.join(`${SEPARADOR_LISTA_IN} `)
      : String(item.valor),
    umbralMinutos:
      item.umbral_minutos === null || item.umbral_minutos === undefined
        ? ''
        : String(item.umbral_minutos),
  }
}
