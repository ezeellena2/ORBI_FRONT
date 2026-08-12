import type { VarianteBadge } from '@/shared/ui/Badge'
import type { EstadoDocumento, LicenciaConductorDto } from '@/services/contracts/flota'

/**
 * Presentacion de la LICENCIA del conductor. Es la "capa 2" que la primitiva `Badge` deja afuera:
 * el mapeo `codigo -> variante + clave i18n` vive en el modulo.
 *
 * ── DOS FUENTES DISTINTAS, Y NO SON INTERCAMBIABLES ───────────────────────────────────────────
 * 1. **`EstadoDocumento` del backend** (`vigente | por_vencer | vencido | sin_cargar`): lo CALCULA
 *    el server al leer, con el umbral de 30 dias que vive en `f-01`. Llega en
 *    `ConductorDetalleDto.documentosObligatorios[tipo='licencia'].estado` y en
 *    `DocumentoDto.estadoDerivado`. Cuando esta disponible, **manda**.
 * 2. **`LicenciaConductorDto` del listado**: trae `diasParaVencer`, NO trae `estadoDerivado`.
 *
 * ── ⚠️ DRIFT: EL BADGE DE 4 ESTADOS NO SE PUEDE PINTAR EN EL LISTADO ──────────────────────────
 * `f-05` §2 pide el badge de 4 estados por fila **y a la vez** prohibe recalcular el umbral
 * ("el estado llega calculado del backend; el front **no recalcula el umbral**"). Las dos cosas no
 * pueden ser ciertas juntas: `ConductorListItemDto.licencia` **no tiene** `estadoDerivado`, asi que
 * distinguir `vigente` de `por_vencer` exige que el front decida que son 30 dias — que es
 * exactamente lo prohibido, y ademas duplicaria una regla de negocio en dos lugares.
 *
 * Se resuelve **degradando el vocabulario del listado a lo que el contrato SI afirma**, sin inventar:
 *  - sin objeto `licencia` → `sin_cargar` (es una AUSENCIA, no una derivacion).
 *  - `diasParaVencer === null` → `sin_vencimiento` (metadatos cargados sin fecha; `dtos.ts` declara
 *    ese `null` como "no hay fecha cargada").
 *  - `diasParaVencer < 0` → `vencida`. Tampoco es un umbral: `dtos.ts` dice literal
 *    "negativo = vencida".
 *  - `diasParaVencer >= 0` → `vigente`, **con la cantidad de dias en el texto**. No se pinta ambar:
 *    el front no sabe donde esta el corte. La informacion no se pierde — el usuario lee
 *    "Vence en 12 dias" y decide; lo que no se hace es fingir una clasificacion que no tenemos.
 *
 * El estado `por_vencer` SI se pinta en el DETALLE, donde el backend lo manda hecho.
 *
 * **PENDIENTE (drift reportado)**: agregar `estadoDerivado` a `LicenciaConductorDto` del listado
 * (el dato ya existe por documento en el backend) o ratificar que el front lea el umbral.
 * Decide: PO + `dtos.ts`.
 *
 * ⚠️ `categoria` viene SIEMPRE `null` (B-21: no tiene columna en ninguna tabla), asi que la parte
 * "B1 · vence …" del mockup nunca se puede pintar entera. Se muestra su fallback.
 */

/** Vocabulario del badge del LISTADO. No es un catalogo del backend: es presentacion local. */
export type EstadoLicenciaVisible = 'sin_cargar' | 'sin_vencimiento' | 'vencida' | 'vigente'

const VARIANTE_POR_ESTADO_VISIBLE: Record<EstadoLicenciaVisible, VarianteBadge> = {
  sin_cargar: 'neutro',
  sin_vencimiento: 'neutro',
  vencida: 'peligro',
  vigente: 'exito',
}

/** Estado del documento tal como lo DERIVA el backend (umbral incluido). Acá solo se pinta. */
const VARIANTE_POR_ESTADO_DOCUMENTO: Record<EstadoDocumento, VarianteBadge> = {
  vigente: 'exito',
  por_vencer: 'advertencia',
  vencido: 'peligro',
  sin_cargar: 'neutro',
}

export function estadoLicenciaVisible(
  licencia: LicenciaConductorDto | null,
): EstadoLicenciaVisible {
  if (licencia === null) return 'sin_cargar'
  if (licencia.diasParaVencer === null) return 'sin_vencimiento'
  return licencia.diasParaVencer < 0 ? 'vencida' : 'vigente'
}

export function varianteDeLicenciaVisible(estado: EstadoLicenciaVisible): VarianteBadge {
  return VARIANTE_POR_ESTADO_VISIBLE[estado]
}

export function varianteDeEstadoDocumento(estado: EstadoDocumento): VarianteBadge {
  return VARIANTE_POR_ESTADO_DOCUMENTO[estado]
}

/** Clave i18n del catálogo de estados de documento. El código `snake_case` es la clave. */
export function claveDeEstadoDocumento(estado: EstadoDocumento): string {
  return `estadoDocumento.${estado}`
}

/**
 * Clave i18n del catálogo `tipos_documento_conductor_flota`.
 *
 * ⚠️ El catalogo es de TABLA y **no tiene endpoint** (`api.md` no expone
 * `GET /catalogos/tipos-documento`, PENDIENTE de `f-04` paso 7). Los 6 codigos del seed estan
 * traducidos; si una organizacion agrega el suyo, quien llame tiene que pasar el codigo como
 * `defaultValue` para que se lea el codigo crudo y no la clave i18n.
 */
export function claveDeTipoDocumento(tipo: string): string {
  return `tipoDocumentoConductor.${tipo}`
}
