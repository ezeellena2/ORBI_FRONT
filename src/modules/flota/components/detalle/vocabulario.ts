import type { VarianteBadge } from '@/shared/ui/Badge'
import type { EstadoOperativoVehiculo } from '@/services/contracts/flota'

/**
 * Mapeo `código de catálogo → variante de badge + clave i18n`. Es la CAPA 2 que la primitiva
 * `Badge` deja explícitamente afuera de sí misma: si el badge conociera los códigos habría que
 * tocarlo cada vez que un módulo agrega un estado.
 *
 * Los códigos son `snake_case` y son EXACTAMENTE los strings que expone el DTO. Acá solo se elige
 * cómo se pinta y qué clave traduce; el valor nunca se reescribe.
 *
 * ⚠️ El vocabulario de CONEXIÓN no vive acá: vive en `modules/flota/vocabulario-conexion.ts`
 * (slice-05), que lo comparte con los 3 listados, las fichas y el mapa, y que distingue `sin_dato`
 * de `desconectado`.
 *
 * Este archivo lo re-exportaba (`claveDeConexion` / `varianteDeConexion`) como puente para el
 * `Badge` suelto del hero. Ese re-export **se quitó al quedar sin consumidores**, y no por prolijidad:
 * era el atajo por el que se armaba un badge de conexión "a mano" —variante + etiqueta— **sin la
 * línea de ayuda**, que es justamente lo que hace que `sin_dato` no se lea como "desconectado". Para
 * pintar conexión hay UNA sola forma: el componente `BadgeConexion`, que trae etiqueta + variante +
 * ayuda juntas.
 */

const VARIANTE_POR_ESTADO_OPERATIVO: Record<EstadoOperativoVehiculo, VarianteBadge> = {
  operativo: 'exito',
  fuera_de_servicio: 'advertencia',
  baja_operativa: 'peligro',
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
