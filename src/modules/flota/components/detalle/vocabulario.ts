import type { VarianteBadge } from '@/shared/ui/Badge'
import type { EstadoConexion, EstadoOperativoVehiculo } from '@/services/contracts/flota'

/**
 * Mapeo `código de catálogo → variante de badge + clave i18n`. Es la CAPA 2 que la primitiva
 * `Badge` deja explícitamente afuera de sí misma: si el badge conociera los códigos habría que
 * tocarlo cada vez que un módulo agrega un estado.
 *
 * Los códigos son `snake_case` y son EXACTAMENTE los strings que expone el DTO. Acá solo se elige
 * cómo se pinta y qué clave traduce; el valor nunca se reescribe.
 */

const VARIANTE_POR_CONEXION: Record<EstadoConexion, VarianteBadge> = {
  en_linea: 'exito',
  desconectado: 'peligro',
  // "sin dispositivo asignado": no es una falla, es una configuración incompleta.
  incompleto: 'advertencia',
  // Telemetría no respondió o nunca hubo dato. Neutro a propósito: pintarlo de rojo diría que el
  // vehículo está mal, cuando lo que falta es la fuente. Hoy el backend sirve SIEMPRE este valor
  // (Telemetría se compone en slice-05), así que es el estado partial-data por defecto.
  sin_dato: 'neutro',
}

const VARIANTE_POR_ESTADO_OPERATIVO: Record<EstadoOperativoVehiculo, VarianteBadge> = {
  operativo: 'exito',
  fuera_de_servicio: 'advertencia',
  baja_operativa: 'peligro',
}

export function varianteDeConexion(estado: EstadoConexion): VarianteBadge {
  return VARIANTE_POR_CONEXION[estado]
}

export function claveDeConexion(estado: EstadoConexion): string {
  return `estadoConexion.${estado}`
}

export function varianteDeEstadoOperativo(estado: EstadoOperativoVehiculo): VarianteBadge {
  return VARIANTE_POR_ESTADO_OPERATIVO[estado]
}

export function claveDeEstadoOperativo(estado: EstadoOperativoVehiculo): string {
  return `estadoOperativo.${estado}`
}

/**
 * Clave i18n de un código de tipo de vehículo del catálogo canónico.
 *
 * El backend manda también un `nombre` base; quien llame usa ese `nombre` como `defaultValue` para
 * que un código nuevo del catálogo se vea con su etiqueta del servidor en vez de con la clave cruda.
 */
export function claveDeTipoVehiculo(codigo: string): string {
  return `tipoVehiculo.${codigo}`
}
