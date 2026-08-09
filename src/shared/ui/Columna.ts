/**
 * Familia C — `Columna`. Origen: PROPIO (02-primitivas.md).
 *
 * NO es un componente: es el descriptor de datos con el que `Tabla` sabe qué
 * dibujar. Se cuenta como una de las 32 entradas P0 del catálogo justamente
 * porque el contrato de la tabla vive acá, no en el JSX.
 *
 * Dos decisiones que parecen detalles y no lo son:
 *
 * 1. `ordenable` es OPT-IN. Hay columnas que no se pueden ordenar server-side
 *    —los campos compuestos que llegan de otro servicio, por ejemplo el estado
 *    de conexión que aporta Telemetría— porque no existen como columna en la
 *    base. Marcarlas ordenables promete algo que el backend no puede cumplir.
 *
 * 2. `tipo: 'mono'` no es estética. Patentes, VIN, IMEI, coordenadas, ids y
 *    códigos de error se leen carácter por carácter, y en proporcional `0/O` y
 *    `1/l` se confunden.
 */

export type TipoColumna = 'texto' | 'mono' | 'numero' | 'fecha' | 'nodo' | 'acciones'

export type AlineacionColumna = 'izquierda' | 'centro' | 'derecha'

export interface Columna<T> {
  /** Clave estable. Es la que viaja como campo de orden al backend. */
  clave: string
  /** Encabezado visible. Ya resuelto por i18n antes de llegar acá. */
  titulo: string
  tipo?: TipoColumna
  /** Solo si el backend puede ordenar por este campo. Ver nota 1 de arriba. */
  ordenable?: boolean
  /** Ancho inicial en píxeles. El usuario puede redimensionar desde el header. */
  ancho?: number
  alineacion?: AlineacionColumna
  /**
   * Cómo se dibuja la celda. Si no se pasa, se muestra `fila[clave]` tal cual.
   * Es el punto de extensión para badges, enlaces y menús de fila.
   */
  render?: (fila: T) => React.ReactNode
}

export type DireccionOrden = 'asc' | 'desc'

export interface EstadoOrden {
  clave: string
  direccion: DireccionOrden
}
