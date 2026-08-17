import type { SituacionVehiculo } from '@/services/contracts/flota'

/**
 * Vocabulario del filtro `situacion` de `GET /api/flota/vehiculos` — el TERCER eje del vehiculo.
 *
 * Los 3 ejes no se colapsan y confundirlos es el error clasico de esta pantalla:
 *  - `situacion` (este archivo): QUE RECURSOS tiene atados el vehiculo (GPS, conductor).
 *  - `EstadoConexion` (`vocabulario-conexion.ts`): si el GPS esta REPORTANDO.
 *  - `estadoOperativo`: si la organizacion lo tiene operativo o fuera de servicio.
 *
 * ══ POR QUE ESTE FILTRO NO SE CAE CON TELEMETRIA ════════════════════════════════════════════
 * `situacion` se resuelve con `EXISTS` / `NOT EXISTS` INTRA-SCHEMA sobre las tablas de asignacion
 * de Flota, con periodo abierto (`hasta IS NULL` y `activo`) — no toca Telemetria. Es la diferencia
 * que importa cuando el servicio de posicion no responde: el filtro de conexion deja de encontrar
 * (todo vale `sin_dato`) y este sigue siendo exacto.
 *
 * Y hay un segundo motivo por el que vale la pena que exista, verificado contra el backend:
 * `VehiculoListItemDto.dispositivo` viene `null` en el 100% de las respuestas (composicion
 * intra-schema que ningun slice tomo), asi que la COLUMNA "Dispositivo" no puede afirmar quien tiene
 * GPS — pero el filtro SI, porque el `EXISTS` corre del lado del server sobre la asignacion real.
 * Filtrar por "Sin dispositivo GPS" es hoy la unica forma confiable de encontrarlos desde acá.
 *
 * `con_conductor` cuenta CUALQUIER asignacion vigente, no solo la del principal (`datos.md` §4
 * admite secundarios y turnos, y el contrato del filtro dice "con conductor", no "con conductor
 * principal").
 */

/** Los 4 valores del vocabulario cerrado, en orden de presentacion. */
export const VALORES_SITUACION_VEHICULO = [
  'con_dispositivo_gps',
  'sin_dispositivo_gps',
  'con_conductor',
  'sin_conductor',
] as const satisfies readonly SituacionVehiculo[]

/**
 * Etiqueta del valor. Las 4 claves viven en `flota:situacionVehiculo.*`.
 *
 * El codigo viaja SIEMPRE en snake_case (D-7) y solo se traduce para mostrarlo: nada de lo que se
 * ve cambia el valor que el front le manda al backend.
 */
export function claveDeSituacion(situacion: SituacionVehiculo): string {
  return `situacionVehiculo.${situacion}`
}
