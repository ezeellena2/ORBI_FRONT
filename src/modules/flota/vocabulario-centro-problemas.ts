import type {
  AccionProblema,
  CodigoFactorPrioridad,
  EstadoAlerta,
  EstadoEntregaWebhook,
  EstadoProblema,
  EstadoSlaProblema,
  MotivoCondicionInvalida,
  OrigenSenal,
  SeveridadAlerta,
  SeveridadProblema,
  TipoProblema,
  TipoReglaProblema,
  TipoTimelineProblema,
} from '@/services/contracts/flota'
import type { VarianteBadge } from '@/shared/ui/Badge'

/**
 * Vocabulario del CENTRO DE PROBLEMAS — una sola definicion de como se traduce el contrato de
 * slice-06 a lo que ve el usuario. Lo comparten las 4 vistas del Centro (sala, timeline, kanban,
 * ticket), la tabla de reglas y la pantalla de integraciones.
 *
 * Mismo rol que `vocabulario-conexion.ts` para slice-05: el mapeo `codigo de catalogo -> variante +
 * label` es la capa que la primitiva `Badge` deja afuera a proposito.
 *
 * ══ LA TRAMPA DE ESTE SLICE, ESCRITA UNA VEZ ════════════════════════════════════════════════════
 * En slice-05 la trampa era confundir una AUSENCIA con una AFIRMACION (`sin_dato` vs.
 * `desconectado`). Acá es otra, y es peor porque produce **reintentos infinitos**:
 *
 *   **Una operacion que el backend NO PUEDE completar todavia no es un error del usuario, ni un
 *   fallo transitorio, ni un conflicto de negocio.**
 *
 * El caso testigo es la transicion de estado del problema (el drag del kanban). Su endpoint **no
 * esta enrutado** y su catalogo de transiciones esta **vacio a proposito**: no hay dato que
 * corregir, no hay momento en el que vaya a funcionar y **reintentar no cambia nada**. Si la
 * pantalla lo presenta como "error, volve a intentar", el operador reintenta para siempre.
 *
 * Por eso este archivo separa **3 cosas que el status HTTP mezcla**:
 *  1. lo que esta **BLOQUEADO por contrato** (`CAPACIDADES_BLOQUEADAS_DEL_CENTRO`) — se declara
 *     ANTES de emitir el request, y en varios casos el request ni siquiera se emite;
 *  2. lo que es un **conflicto de negocio real** (el estado persistido cambio) — refrescar y
 *     reelegir;
 *  3. lo que es un **fallo de transporte** — reintentar sirve.
 *
 * ══ SE RAMIFICA POR `code`, NUNCA POR STATUS ════════════════════════════════════════════════════
 * Los 3 tratamientos conviven en el mismo par de status (400/409) y piden acciones OPUESTAS. Un
 * `if (status === 409)` los confunde y le da el consejo equivocado al usuario. Misma regla que
 * `vocabulario-asignacion.ts` de slice-03, que es el precedente de forma.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

/* ══ 1. Vocabularios cerrados ══════════════════════════════════════════════════════════════════ */

/** Los 7 codigos de `estados_problema_flota`, en orden de avance del caso. */
export const ESTADOS_PROBLEMA = [
  'detectado',
  'priorizado',
  'asignado',
  'en_analisis',
  'silenciado',
  'resuelto',
  'descartado',
] as const satisfies readonly EstadoProblema[]

/**
 * Los 2 TERMINALES. No es decorativo: sobre un problema terminal el backend rechaza asignar,
 * silenciar y resolver con **el mismo** 409 `flota.problema.transicion_invalida` que usa para la
 * transicion bloqueada — el catalogo no tiene code para "accion sobre problema cerrado" y el backend
 * no lo invento (patron D-S3-15/16). Distinguirlos exige mirar `args.estadoActual`, y eso es lo que
 * hace `tratamientoDeErrorCentro`.
 */
export const ESTADOS_PROBLEMA_TERMINALES = [
  'resuelto',
  'descartado',
] as const satisfies readonly EstadoProblema[]

export function esEstadoTerminal(estado: string | null | undefined): boolean {
  return estado === 'resuelto' || estado === 'descartado'
}

/** Los 4 de `severidades_problema_flota`. ⚠️ Distinto vocabulario que el de ALERTA (3, sin `critica`). */
export const SEVERIDADES_PROBLEMA = [
  'critica',
  'alta',
  'media',
  'baja',
] as const satisfies readonly SeveridadProblema[]

/** Los 12 de `tipos_problema_flota`. Los 2 de geozona estan sembrados y nunca se pueblan (DA-08). */
export const TIPOS_PROBLEMA = [
  'dtc_critico',
  'dispositivo_sin_senal',
  'gps_desconectado_ignicion_activa',
  'salida_geozona_critica',
  'entrada_zona_restringida',
  'exceso_velocidad_sostenido',
  'movimiento_sin_conductor',
  'licencia_vencida',
  'vehiculo_incompleto',
  'mantenimiento_vencido',
  'bateria_baja',
  'manipulacion_dispositivo',
] as const satisfies readonly TipoProblema[]

/**
 * Los 8 de `origenes_senal_flota`. El swimlane `geozona` del timeline se **conserva vacio** y
 * declarado (DIFERIDO DA-08): sacarlo del layout esconderia que la capacidad existe y esta apagada.
 */
export const ORIGENES_SENAL = [
  'telemetria',
  'diagnostico',
  'geozona',
  'conductor',
  'dispositivo',
  'calidad_datos',
  'mantenimiento',
  'operacion',
] as const satisfies readonly OrigenSenal[]

/** Los 8 de `tipos_timeline_problema_flota`. */
export const TIPOS_TIMELINE_PROBLEMA = [
  'detectado',
  'prioridad_cambiada',
  'asignado',
  'comentario',
  'silenciado',
  'webhook',
  'resuelto',
  'descartado',
] as const satisfies readonly TipoTimelineProblema[]

/** Los 4 del union de `sla.estado`. Ver `ESTADOS_SLA_EMITIDOS` antes de dibujar un badge. */
export const ESTADOS_SLA_PROBLEMA = [
  'vigente',
  'por_vencer',
  'vencido',
  'sin_sla',
] as const satisfies readonly EstadoSlaProblema[]

/**
 * Los que el backend **realmente emite**: 3 de los 4.
 *
 * ⚠️ `por_vencer` **NO SE EMITE NUNCA**. `EstadoSlaDerivado` solo devuelve `sin_sla`, `vencido` o
 * `vigente`, porque **ningun documento del contrato fija el umbral** — el 25 % que aparece en
 * `motor-de-reglas.md` §3.1 es la condicion del *factor de prioridad* `sla_restante`, escrita para
 * otra cosa, y usarlo aca seria decidir por el PO. Es el mismo patron con el que el mapa no emite
 * `ralenti` y la conexion no emite `incompleto` (B-31).
 *
 * ⇒ **Ninguna pantalla dibuja el badge ambar de "por vencer"**, ni deriva el umbral en el cliente
 * con `minutosRestantes`: derivarlo seria inventar el mismo numero, solo que en otro archivo.
 */
export const ESTADOS_SLA_EMITIDOS = [
  'vigente',
  'vencido',
  'sin_sla',
] as const satisfies readonly EstadoSlaProblema[]

/** Los 7 factores de prioridad, en el orden de `motor-de-reglas.md` §3.1. */
export const FACTORES_PRIORIDAD = [
  'severidad_base',
  'contexto_operativo',
  'urgencia',
  'recurrencia',
  'criticidad_activo',
  'impacto_potencial',
  'sla_restante',
] as const satisfies readonly CodigoFactorPrioridad[]

/** Los 8 de `tipos_regla_problema_flota` (mismos codigos que los origenes, otra tabla). */
export const TIPOS_REGLA_PROBLEMA = ORIGENES_SENAL satisfies readonly TipoReglaProblema[]

/** Los 5 de `estados_entrega_webhook_flota`. La tabla de entregas tiene que poder pintar los 5. */
export const ESTADOS_ENTREGA_WEBHOOK = [
  'pendiente',
  'enviado',
  'fallido',
  'reintentando',
  'agotado',
] as const satisfies readonly EstadoEntregaWebhook[]

/** Los 3 de `estados_alerta_flota` (D-C6). */
export const ESTADOS_ALERTA = [
  'abierta',
  'gestionada',
  'cerrada',
] as const satisfies readonly EstadoAlerta[]

/** Los 3 de `severidades_alerta_flota`. Sin `critica`: no es el vocabulario del problema. */
export const SEVERIDADES_ALERTA = [
  'alta',
  'media',
  'baja',
] as const satisfies readonly SeveridadAlerta[]

/** Los 9 valores de `args.motivo` del 400 `flota.regla.condicion_invalida`. */
export const MOTIVOS_CONDICION_INVALIDA = [
  'version_no_soportada',
  'combinador_no_soportado',
  'cantidad_de_condiciones_invalida',
  'campo_desconocido',
  'operador_no_admitido',
  'tipo_de_valor_incompatible',
  'umbral_minutos_invalido',
  'lista_in_invalida',
  'json_no_parseable',
] as const satisfies readonly MotivoCondicionInvalida[]

/* ══ 2. Claves i18n (se arman por concatenacion ⇒ las ancla el test) ═══════════════════════════ */

export function claveDeEstadoProblema(estado: EstadoProblema): string {
  return `estadoProblema.${estado}`
}

export function claveDeSeveridadProblema(severidad: SeveridadProblema): string {
  return `severidadProblema.${severidad}`
}

export function claveDeTipoProblema(tipo: TipoProblema): string {
  return `tipoProblema.${tipo}`
}

export function claveDeOrigenSenal(origen: OrigenSenal): string {
  return `origenSenal.${origen}`
}

export function claveDeTipoTimeline(tipo: TipoTimelineProblema): string {
  return `tipoTimelineProblema.${tipo}`
}

export function claveDeEstadoSla(estado: EstadoSlaProblema): string {
  return `estadoSlaProblema.${estado}`
}

/**
 * Etiqueta del factor de prioridad.
 *
 * ⚠️ **La resuelve el front y no el backend, a proposito**: `FactorPrioridadDto.etiqueta` y
 * `.explicacion` viajan **vacias** porque son COPY y el backend tiene prohibido hardcodear copy de
 * negocio. Pintar `factor.etiqueta` directo deja la celda en blanco.
 */
export function claveDeFactorPrioridad(codigo: CodigoFactorPrioridad): string {
  return `factorPrioridad.${codigo}`
}

/** Explicacion de una linea del factor — la que hace que el desglose sea auditable y no decorativo. */
export function claveDeAyudaDeFactorPrioridad(codigo: CodigoFactorPrioridad): string {
  return `factorPrioridad.ayuda.${codigo}`
}

export function claveDeAccionProblema(accion: AccionProblema): string {
  return `accionProblema.${accion}`
}

export function claveDeTipoRegla(tipo: TipoReglaProblema): string {
  return `tipoRegla.${tipo}`
}

export function claveDeEstadoEntrega(estado: EstadoEntregaWebhook): string {
  return `estadoEntregaWebhook.${estado}`
}

export function claveDeEstadoAlerta(estado: EstadoAlerta): string {
  return `estadoAlerta.${estado}`
}

export function claveDeSeveridadAlerta(severidad: SeveridadAlerta): string {
  return `severidadAlerta.${severidad}`
}

/** Motivo legible del rechazo del DSL. Lo que hace accionable el 400 de la regla. */
export function claveDeMotivoCondicionInvalida(motivo: string): string {
  return (MOTIVOS_CONDICION_INVALIDA as readonly string[]).includes(motivo)
    ? `condicionInvalida.motivo.${motivo}`
    : 'condicionInvalida.motivo.desconocido'
}

/* ══ 3. Variantes de badge ════════════════════════════════════════════════════════════════════ */

const VARIANTE_POR_SEVERIDAD_PROBLEMA: Record<SeveridadProblema, VarianteBadge> = {
  critica: 'peligro',
  alta: 'peligro',
  media: 'advertencia',
  baja: 'neutro',
}

export function varianteDeSeveridadProblema(severidad: SeveridadProblema): VarianteBadge {
  return VARIANTE_POR_SEVERIDAD_PROBLEMA[severidad]
}

/**
 * Estado del problema.
 *
 * `silenciado` es **neutro y no advertencia**: silenciar es una decision deliberada del operador, no
 * una anomalia. `descartado` tampoco es peligro — es un cierre valido, igual que `resuelto`, y
 * pintarlo de rojo sugeriria que algo salio mal.
 */
const VARIANTE_POR_ESTADO_PROBLEMA: Record<EstadoProblema, VarianteBadge> = {
  detectado: 'info',
  priorizado: 'info',
  asignado: 'accion',
  en_analisis: 'accion',
  silenciado: 'neutro',
  resuelto: 'exito',
  descartado: 'neutro',
}

export function varianteDeEstadoProblema(estado: EstadoProblema): VarianteBadge {
  return VARIANTE_POR_ESTADO_PROBLEMA[estado]
}

/**
 * Reloj de SLA.
 *
 * ⚠️ `sin_sla` es **NEUTRO**, no `exito`. No significa "a tiempo": significa que el problema **no
 * tiene reloj**. Pintarlo verde afirmaria que va bien un caso que nadie esta midiendo — es la misma
 * clase de mentira que pintar `sin_dato` de rojo en el badge de conexion.
 *
 * `por_vencer` esta en el mapa porque el vocabulario es cerrado, y **no tiene camino**: el backend
 * no lo emite (ver `ESTADOS_SLA_EMITIDOS`).
 */
const VARIANTE_POR_ESTADO_SLA: Record<EstadoSlaProblema, VarianteBadge> = {
  vigente: 'exito',
  por_vencer: 'advertencia',
  vencido: 'peligro',
  sin_sla: 'neutro',
}

export function varianteDeEstadoSla(estado: EstadoSlaProblema): VarianteBadge {
  return VARIANTE_POR_ESTADO_SLA[estado]
}

/**
 * Estado de una entrega de webhook.
 *
 * `reintentando` es **advertencia y no info**: con B-40 abierto, una fila en `reintentando` **no
 * avanza sola** — nadie drena la cola. Pintarla como "en curso" prometeria un progreso que no
 * existe.
 */
const VARIANTE_POR_ESTADO_ENTREGA: Record<EstadoEntregaWebhook, VarianteBadge> = {
  pendiente: 'neutro',
  enviado: 'exito',
  fallido: 'peligro',
  reintentando: 'advertencia',
  agotado: 'peligro',
}

export function varianteDeEstadoEntrega(estado: EstadoEntregaWebhook): VarianteBadge {
  return VARIANTE_POR_ESTADO_ENTREGA[estado]
}

/* ══ 4. Badge derivado del endpoint de webhook (DA-IN-02, tabla de `dtos.ts`) ══════════════════ */

/**
 * El badge del endpoint **no es un campo**: se DERIVA de `activo` (configuracion) + `ultimoEstado`
 * (resultado de la ultima entrega). El contrato lo dice explicito y por eso no hay enum nuevo.
 *
 * Las etiquetas del mockup (`Activo` / `Reintento` / `Pausado`) son demo y **no se portan**.
 */
export type EstadoDerivadoWebhook =
  | 'inactivo'
  | 'sin_envios'
  | 'activo'
  | 'pendiente'
  | 'con_errores'
  | 'fallando'

/**
 * ⚠️ `activo === false` gana **siempre**, incluso con `ultimoEstado` poblado: un endpoint pausado no
 * recibe entregas, asi que su ultimo resultado es historia y no estado. Mostrarlo como "Fallando"
 * mandaria a alguien a arreglar un endpoint que esta apagado a proposito.
 *
 * ══ LAS 6 FILAS SON LAS DEL CONTRATO, LITERALES (`dtos.ts` §9 "Badge de estado") ═════════════════
 * ```
 *   activo=false, cualquiera             -> Inactivo   (gana sobre el ultimo estado)
 *   activo=true,  null                   -> Sin envios
 *   activo=true,  enviado                -> Activo
 *   activo=true,  pendiente|reintentando -> Pendiente
 *   activo=true,  fallido                -> Con errores
 *   activo=true,  agotado                -> Fallando
 * ```
 *
 * 🔴 **CORRECCION (f-10/f-11).** Esta funcion tenia 2 de las 6 filas cambiadas: `reintentando` caia
 * en `con_errores` y `fallido` en `fallando`. No es un matiz de etiqueta — **destruia la escalera que
 * el contrato modela**:
 *  - `reintentando` es una entrega **en vuelo** (su backoff todavia no vencio), no un fallo cerrado.
 *    Pintarla "Con errores" manda a investigar un endpoint que puede estar por entregar bien.
 *  - `fallido` (una entrega que termino mal) y `agotado` (se acabaron los reintentos) colapsaban en
 *    la **misma** etiqueta, y "Fallando" existe justamente para separarlos: uno es un incidente
 *    puntual, el otro es un endpoint que dejo de recibir.
 *
 * `f-11` §Verificacion lo pide con estas palabras: los badges muestran **exactamente** las etiquetas
 * de la tabla, con assert por combinacion.
 */
export function estadoDerivadoDeWebhook(
  activo: boolean,
  ultimoEstado: EstadoEntregaWebhook | null,
): EstadoDerivadoWebhook {
  if (!activo) return 'inactivo'
  if (ultimoEstado === null) return 'sin_envios'

  switch (ultimoEstado) {
    case 'enviado':
      return 'activo'
    case 'pendiente':
    case 'reintentando':
      return 'pendiente'
    case 'fallido':
      return 'con_errores'
    case 'agotado':
      return 'fallando'
  }
}

const VARIANTE_POR_ESTADO_DERIVADO: Record<EstadoDerivadoWebhook, VarianteBadge> = {
  inactivo: 'neutro',
  sin_envios: 'neutro',
  activo: 'exito',
  pendiente: 'info',
  con_errores: 'advertencia',
  fallando: 'peligro',
}

export function varianteDeEstadoDerivadoDeWebhook(estado: EstadoDerivadoWebhook): VarianteBadge {
  return VARIANTE_POR_ESTADO_DERIVADO[estado]
}

export function claveDeEstadoDerivadoDeWebhook(estado: EstadoDerivadoWebhook): string {
  return `estadoWebhook.${estado}`
}

/* ══ 5. Catalogo publico de eventos de webhook ════════════════════════════════════════════════ */

/**
 * Los **14** nombres publicos de `api.md` §Catalogo de eventos de webhook.
 *
 * Viven en el front porque **no existe endpoint de catalogo** (esa es una de las 3 mitades de
 * DA-IN-08). Son informativos: material de onboarding del integrador, read-only.
 *
 * ⚠️ El mockup dibuja **12** — le faltan `problem.priority_changed` y `problem.assigned`. Manda el
 * contrato. `webhook.test` **no se lista**: es exclusivo del endpoint de prueba y no es suscribible.
 *
 * ⚠️ Nomenclatura DUAL por diseno: los nombres publicos son en **ingles** y estables para terceros;
 * el bus interno va en espanol (`flota.<recurso-y-hecho>.v1`). **No se traduce el catalogo publico**
 * ni se mezcla con el interno.
 *
 * ⚠️ `disponible: false` **no es "todavia no": es que la fuente no existe** — los 2 de geozona
 * dependen de DA-08 (no hay una sola linea de logica de geozona en la solucion) y `maintenance.due`
 * del servicio Operaciones, que no existe en `src/`.
 *
 * ⚠️⚠️ Y lo que vale para **los 14**: hoy **ningun** endpoint tiene suscripciones, porque el alta no
 * acepta `eventos[]` (PENDIENTE #3). Esta lista describe el catalogo, **no** lo que va a llegar.
 */
export interface EventoPublicoWebhook {
  readonly nombre: string
  readonly disponible: boolean
}

export const EVENTOS_PUBLICOS_WEBHOOK: readonly EventoPublicoWebhook[] = [
  { nombre: 'vehicle.location.updated', disponible: true },
  { nombre: 'vehicle.status.changed', disponible: true },
  { nombre: 'problem.detected', disponible: true },
  { nombre: 'problem.priority_changed', disponible: true },
  { nombre: 'problem.assigned', disponible: true },
  { nombre: 'problem.resolved', disponible: true },
  { nombre: 'fault.opened', disponible: true },
  { nombre: 'fault.closed', disponible: true },
  { nombre: 'geofence.entered', disponible: false }, // DIFERIDO DA-08
  { nombre: 'geofence.exited', disponible: false }, // DIFERIDO DA-08
  { nombre: 'device.offline', disponible: true },
  { nombre: 'device.online', disponible: true },
  { nombre: 'driver.license_expiring', disponible: true },
  { nombre: 'maintenance.due', disponible: false }, // el servicio Operaciones no existe
] as const

/* ══ 6. Lo que el Centro NO puede hacer, y por que ════════════════════════════════════════════ */

/**
 * Capacidades que la pantalla **tiene que declarar apagadas**, con su motivo visible.
 *
 * No es documentacion: es dato que la UI consume. La regla del modulo es "nunca un boton para una
 * operacion que el backend no puede completar; si esta bloqueada, o no va, o va **deshabilitada CON
 * EL MOTIVO visible**". Este mapa es de donde sale ese motivo, para que las 6 pantallas del Centro
 * digan lo mismo y para que el dia que un bloqueante cierre haya **un solo lugar** que tocar.
 */
export interface CapacidadBloqueada {
  /** Clave i18n del motivo, en `flota:centroBloqueado.*`. Es texto para el usuario, no para el log. */
  readonly clave: string
  /** Id del bloqueante en `src/Flota/docs/ESTADO.md`. Para el comentario del codigo, no para la UI. */
  readonly bloqueante: string
  /**
   * `false` = la UI **no debe emitir el request**: el endpoint no esta enrutado y la llamada seria un
   * 404 de routing **sin `code`**, que ninguna pantalla puede explicar.
   * `true` = el endpoint responde, pero lo que promete no ocurre (caso `reintentarEntregas`).
   */
  readonly endpointEnrutado: boolean
}

export const CAPACIDADES_BLOQUEADAS_DEL_CENTRO = {
  /**
   * El drag del kanban. Doble bloqueo: falta el **body** en `dtos.ts` y falta el **catalogo de
   * transiciones** (`transiciones_problema_flota` no se creo). El caso de uso del server es
   * fail-closed —con el catalogo vacio toda transicion da 409— pero el endpoint **no esta
   * enrutado**, asi que ni siquiera se llega a ese 409.
   *
   * ⇒ **Lo que `f-08` construyo, y por que difiere de lo que este comentario pedia**: el ciclo
   * completo (optimista -> **ROLLBACK**) esta escrito y probado con su property test en
   * `vocabulario-kanban-problemas.ts`, pero el **drag no se arma**. Al construirlo aparecio el hecho
   * que decide la forma de la pantalla: sin request no hay ventana en vuelo, asi que el estado
   * optimista es **inobservable** —la card nunca llega a verse en la columna destino— y hacerlo
   * visible exigiria una demora artificial, o sea simular el viaje al servidor (el `simToast` del
   * mockup, que el propio paso prohibe portar). El resultado seria "arrastro, no pasa nada, aparece
   * un cartel", que es el modo de falla que el paso existe para evitar.
   *
   * El motivo va **antes** de cualquier intento: aviso permanente arriba del tablero + el asa de
   * cada card apagada con su tooltip. El dia que el endpoint exista, `endpointEnrutado` pasa a
   * `true`, el drag se enciende solo y el ciclo ya probado tiene su llamador.
   */
  cambiarEstadoDeProblema: {
    clave: 'centroBloqueado.cambiarEstado',
    bloqueante: 'PENDIENTE dtos.ts + ddl.sql §6.10 #14',
    endpointEnrutado: false,
  },

  /** `titulo` es NOT NULL y el request trae un solo campo de texto. Sin caso de uso en el server. */
  comentarProblema: {
    clave: 'centroBloqueado.comentar',
    bloqueante: 'PENDIENTE #17',
    endpointEnrutado: false,
  },

  /** Su unico 400 (mas de 10.000 filas) no tiene `code`. Mismo criterio que los 3 export de slice-05. */
  exportarProblemas: {
    clave: 'centroBloqueado.exportar',
    bloqueante: 'B-34',
    endpointEnrutado: false,
  },

  /**
   * Toolbar de las 2 bandejas. `api.md` dice "listado paginado con filtros" y **no nombra ninguno**;
   * el enum de `sortBy` es PENDIENTE. Un chip que se manda y no filtra ya rompio 2 veces en este
   * modulo: **no se dibuja la toolbar de filtros**.
   */
  filtrarBandejas: {
    clave: 'centroBloqueado.filtros',
    bloqueante: 'B-17',
    endpointEnrutado: false,
  },

  /**
   * El alcance de la regla (vehiculos / conductores / geozonas) y sus destinatarios: 3 N:M y 2
   * listas sin tabla puente. **Hoy toda regla alcanza a toda la organizacion**, y el modal lo DICE
   * en vez de ofrecer un selector que no persiste nada.
   */
  alcanceDeRegla: {
    clave: 'centroBloqueado.alcanceRegla',
    bloqueante: 'PENDIENTE #2',
    endpointEnrutado: false,
  },

  /**
   * `eventos[]` / `scopes[]` del endpoint de webhook. Un endpoint nace **sin suscripciones**
   * (fail-closed) y solo funciona el boton "probar": **el fan-out no esta construido**.
   */
  suscripcionesDeWebhook: {
    clave: 'centroBloqueado.suscripciones',
    bloqueante: 'PENDIENTE #3 (DA-IN-08)',
    endpointEnrutado: false,
  },

  /**
   * ⚠️ El unico con `endpointEnrutado: true`. `POST .../reintentar` responde 200 y reencola de
   * verdad; lo que no existe es quien **drene** esa cola, y el cuerpo no es reconstruible. El 200 no
   * miente sobre lo que hace, **si sobre lo que va a pasar**. Por eso el boton no va.
   */
  reintentarEntregas: {
    clave: 'centroBloqueado.reintentarEntregas',
    bloqueante: 'B-40',
    endpointEnrutado: true,
  },

  /**
   * El aviso de "el secreto anterior sigue funcionando" al rotar: **hoy es falso**. Flota firma con
   * el nuevo desde t=0 y manda una sola firma, asi que el receptor viejo pierde el 100 % de las
   * entregas. `secretoAnteriorVigenteHastaUtc` llega poblado y es dato inerte.
   */
  ventanaDeGraciaDelSecreto: {
    clave: 'centroBloqueado.ventanaDeGracia',
    bloqueante: 'B-39',
    endpointEnrutado: true,
  },

  /**
   * Gestionar una alerta. 3 motivos a la vez: permiso contradictorio entre 2 archivos del contrato,
   * sus 2 errores sin `code`, y GATE 2 abierto (no hay fila sobre la cual actuar).
   */
  gestionarAlerta: {
    clave: 'centroBloqueado.gestionarAlerta',
    bloqueante: 'B-38 (GATE 2)',
    endpointEnrutado: false,
  },

  /**
   * La DETECCION de alertas. No es que no haya alertas: **no hay ni un escritor** en el backend,
   * porque el catalogo de `tipo_alerta` esta vacio a proposito y la FK rechaza toda insercion. El
   * listado responde 200 con 0 items, y ese vacio **no puede decir "esta todo bien"**.
   */
  deteccionDeAlertas: {
    clave: 'centroBloqueado.deteccionAlertas',
    bloqueante: 'B-38 (GATE 2)',
    endpointEnrutado: true,
  },
} as const satisfies Record<string, CapacidadBloqueada>

export type CapacidadDelCentro = keyof typeof CAPACIDADES_BLOQUEADAS_DEL_CENTRO

/**
 * ⚠️ **LEER ANTES DE CABLEAR EL DRAG DEL KANBAN.**
 *
 * `false` significa: **no emitas el `POST`**. Una request a una ruta que no existe vuelve como 404
 * de routing **sin `code`**, indistinguible de un problema borrado y sin ningun mensaje que la
 * pantalla pueda mostrar.
 *
 * ⚠️ Y significa una segunda cosa, que `f-08` descubrio al construir el tablero: **sin request no
 * hay ventana en vuelo**, asi que tampoco hay estado optimista observable. Por eso el tablero deriva
 * de esta constante si las cards se arrastran (`ARRASTRE_DE_CARDS_DISPONIBLE` en
 * `vocabulario-kanban-problemas.ts`) y hoy van **apagadas con el motivo a la vista**; el ciclo
 * optimista -> rollback esta construido y probado, esperando llamador.
 *
 * El dia que el PO cierre el body + el catalogo de transiciones: se agrega `cambiarEstado` al
 * `problemas-service`, esta constante pasa a `true`, el drag se enciende solo y **la pantalla no
 * cambia de forma**.
 */
export const TRANSICION_DE_ESTADO_DISPONIBLE =
  CAPACIDADES_BLOQUEADAS_DEL_CENTRO.cambiarEstadoDeProblema.endpointEnrutado

/* ══ 7. El vocabulario de ERRORES del Centro ══════════════════════════════════════════════════ */

/**
 * Como tiene que REACCIONAR la pantalla ante un fallo del Centro de Problemas.
 *
 *  - `transicionBloqueada` — **el caso que este vocabulario existe para separar**. La transicion de
 *    estado no esta habilitada: su catalogo de transiciones esta vacio a proposito y su endpoint no
 *    esta enrutado. **No hay nada que reintentar y no hay dato que corregir.** La card vuelve a su
 *    columna y el aviso explica que el flujo de estados todavia no esta configurado. Un "volve a
 *    intentar" acá manda al operador a un loop infinito.
 *  - `problemaCerrado` — llega con el MISMO `code` que el anterior, y no es lo mismo: el problema ya
 *    esta `resuelto`/`descartado`, asi que la accion no aplica **a ese problema**. Se distingue por
 *    `args.estadoActual`. Lo que corresponde es refrescar y avisar que el caso ya se cerro (quizas
 *    otro operador), no reintentar.
 *  - `condicionInvalida` — el DSL de la regla no valida. Es de **campo**, no de pantalla: el aviso
 *    va en el editor de condicion, con el `indice` y el `motivo` que trae el error. **Nada se
 *    persistio**: no existe "regla rota" en DB.
 *  - `urlNoPermitida` — anti-SSRF del webhook. Tambien de campo (el input de la URL) y accionable:
 *    el usuario puede corregirla.
 *  - `conflicto` — conflicto de NEGOCIO real: el estado persistido cambio bajo los pies. Reintentar
 *    lo mismo vuelve a fallar; corresponde refrescar y reelegir.
 *  - `noEncontrado` — 404 uniforme. No existe, es de otra organizacion, o se borro. **No se
 *    distingue cross-tenant de "no existe", a proposito**: decir "existe pero no es tuyo" filtraria
 *    existencia ajena.
 *  - `sinPermiso` / `moduloNoActivo` — 403. NO son errores recuperables: el forbidden bloquea con
 *    overlay y muestra **EL PERMISO**, no el code.
 *
 *    ⚠️ **Los 2 no llegan por el mismo camino, y conviene saberlo antes de confiar en la rama**:
 *    `flota.modulo.no_activo` **si** viaja en el cuerpo (el gate de modulo tiene su
 *    `ModuloAuthorizationResultHandler`, que le da body al 403 justamente para que se distinga "no
 *    tenes permiso" de "tu organizacion no contrato el modulo"). En cambio, un 403 por **falta de
 *    permiso** lo responde ASP.NET por defecto **SIN cuerpo y sin `code`**: hoy cae en `generico`.
 *    `flota.recurso.sin_permiso` **no lo emite el backend** —`grep` sobre `src/` da 0 hits— y lo
 *    usa el gate del propio frontend (`RequierePermiso`), que sabe el permiso porque se lo pasan
 *    por prop. La rama se deja mapeada para el dia que el backend le de cuerpo a ese 403; mientras
 *    tanto, **la pantalla no debe esperar ese code desde la red**.
 *  - `validacion` — 400 `ValidationProblemDetails` por campo (los 4 obligatorios de silenciar, la
 *    evidencia de resolver). Se mapea a los campos del formulario.
 *  - `red` — no hubo respuesta. **No promete nada sobre si se guardo o no**, porque no se sabe: un
 *    request que nunca volvio pudo haber llegado igual. Es el unico donde "reintentar" es el consejo
 *    correcto sin mas.
 *  - `generico` — cualquier otra cosa.
 */
export type TratamientoErrorCentro =
  | 'transicionBloqueada'
  | 'problemaCerrado'
  | 'condicionInvalida'
  | 'urlNoPermitida'
  | 'conflicto'
  | 'noEncontrado'
  | 'sinPermiso'
  | 'moduloNoActivo'
  | 'validacion'
  | 'red'
  | 'generico'

const CODES_NO_ENCONTRADO = new Set([
  'flota.problema.no_existe',
  'flota.regla.no_existe',
  'flota.webhook.no_existe',
  'flota.recurso.organizacion_invalida',
])

/**
 * ⚠️ El unico `code` de conflicto de negocio que este slice emite es
 * `flota.problema.transicion_invalida`, y **no cae acá**: tiene 2 tratamientos propios porque
 * significa 2 cosas distintas segun `args.estadoActual`. El set queda declarado y vacio de
 * proposito, para que agregar un conflicto nuevo del Centro sea 1 linea y no un `if` suelto en una
 * pantalla.
 *
 * (`flota.regla.nombre_duplicado` **no existe**: DA-PR-07 sigue abierta y el backend no invento el
 * code, asi que la UI tampoco lo anticipa.)
 */
const CODES_CONFLICTO: ReadonlySet<string> = new Set<string>()

/**
 * Clasifica un fallo del Centro **por `code` + `args`**, nunca por status.
 *
 * ⚠️ `args` entra en la firma por UNA razon concreta y no por generalidad: el backend sirve el
 * rechazo por "problema ya cerrado" con el **mismo** `flota.problema.transicion_invalida` que el
 * rechazo por catalogo vacio —el catalogo de errores no tiene un code propio para el primero y el
 * backend no lo invento (patron D-S3-15/16)—, y las 2 situaciones piden mensajes opuestos. El unico
 * discriminante disponible es `args.estadoActual`.
 *
 * Cuando el PO ratifique un code para "accion sobre problema terminal", esta rama se reemplaza por
 * una entrada de set y `args` deja de hacer falta.
 */
export function tratamientoDeErrorCentro(
  code: string | null,
  args: Record<string, unknown> = {},
): TratamientoErrorCentro {
  if (code === null) return 'generico'
  if (code === 'network') return 'red'

  if (code === 'flota.problema.transicion_invalida') {
    return esEstadoTerminal(
      typeof args.estadoActual === 'string' ? args.estadoActual : null,
    )
      ? 'problemaCerrado'
      : 'transicionBloqueada'
  }

  if (code === 'flota.regla.condicion_invalida') return 'condicionInvalida'
  if (code === 'flota.webhook.url_no_permitida') return 'urlNoPermitida'
  if (code === 'flota.modulo.no_activo') return 'moduloNoActivo'
  if (code === 'flota.recurso.sin_permiso') return 'sinPermiso'
  if (code === 'validation.failed') return 'validacion'
  if (CODES_CONFLICTO.has(code)) return 'conflicto'
  if (CODES_NO_ENCONTRADO.has(code)) return 'noEncontrado'

  return 'generico'
}

/**
 * La linea de GUIA que acompana al mensaje del backend: que se supone que haga el usuario ahora.
 *
 * Son 2 textos distintos y hacen falta los 2. El backend resuelve **que paso** (por `message_key`,
 * localizado y con sus `args`); esto resuelve **que hacer**, que el backend no sabe porque depende
 * de la pantalla. Ninguno reemplaza al otro: mostrar solo el del backend deja al usuario sin
 * siguiente paso, y mostrar solo este esconde el detalle.
 */
export function claveDeGuiaDeErrorCentro(tratamiento: TratamientoErrorCentro): string {
  return `centroError.${tratamiento}`
}

/**
 * ¿Tiene sentido ofrecer "Reintentar"?
 *
 * **Solo con `red` y `generico`.** En los demas, reintentar lo mismo vuelve a fallar exactamente
 * igual — y en `transicionBloqueada` no hay ningun momento futuro en el que deje de fallar, que es
 * la razon de ser de este vocabulario.
 */
export function admiteReintento(tratamiento: TratamientoErrorCentro): boolean {
  return tratamiento === 'red' || tratamiento === 'generico'
}

/**
 * ¿El error es de un CAMPO del formulario (y va al input), o de la PANTALLA (y va al banner)?
 *
 * Ponerlo en el banner cuando es de campo obliga al usuario a adivinar cual de los 8 controles del
 * modal esta mal; al reves, un error de pantalla escondido en un input pasa desapercibido.
 */
export function esErrorDeCampo(tratamiento: TratamientoErrorCentro): boolean {
  return (
    tratamiento === 'condicionInvalida' ||
    tratamiento === 'urlNoPermitida' ||
    tratamiento === 'validacion'
  )
}
