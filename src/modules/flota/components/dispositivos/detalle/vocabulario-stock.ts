import type { VarianteBadge } from '@/shared/ui/Badge'
import type { EstadoStockDispositivo } from '@/services/contracts/flota'

/**
 * Mapeo `codigo de catalogo de stock -> variante de badge + clave i18n`, y la maquina de estados que
 * decide que transiciones ofrece la UI. Es la CAPA 2 que la primitiva `Badge` deja afuera de si
 * misma, igual que `components/detalle/vocabulario.ts` hace para los estados del vehiculo.
 *
 * Los codigos son `snake_case` y son EXACTAMENTE los strings que expone el DTO (D-7): aca solo se
 * elige como se pinta y que clave traduce. El valor nunca se reescribe ni se traduce antes de
 * mandarlo al backend.
 */

const VARIANTE_POR_STOCK: Record<EstadoStockDispositivo, VarianteBadge> = {
  // Disponible en deposito para instalar. No es un problema ni un logro: es inventario listo.
  en_stock: 'info',
  instalado: 'exito',
  en_reparacion: 'advertencia',
  // NEUTRO, no `peligro`. Dar de baja un GPS viejo es una operacion normal de inventario, no una
  // falla; ademas es reversible. El rojo esta reservado para lo que salio mal.
  dado_de_baja: 'neutro',
}

/** Lo unico que `POST .../estado-stock` puede pedir. Espeja `CambiarEstadoStockRequest`. */
export type DestinoDeStock = Exclude<EstadoStockDispositivo, 'instalado' | 'dado_de_baja'>

/**
 * Maquina de estados de stock (`datos.md` §3.3), en la direccion "que puedo elegir desde aca".
 *
 * TRES reglas que no se pueden violar y que por eso no aparecen como destino en ninguna fila:
 *  - **`instalado` no es alcanzable por request**: se logra asignando el dispositivo a un vehiculo
 *    (DA-DL-05). `CambiarEstadoStockRequest.estadoNuevo` lo excluye a nivel de tipo.
 *  - **`dado_de_baja` TAMPOCO es alcanzable por este request** (**D-S3-9**, cambio del contrato):
 *    su unico camino es `POST .../baja`, que tiene OTRO permiso (`flota.dispositivos.eliminar` vs
 *    `flota.dispositivos.gestionar-stock`). Ofrecerlo aca era ejecutar la baja con el permiso
 *    equivocado y el efecto era identico. Hoy el backend lo RECHAZA con 409.
 *  - **`dado_de_baja` sigue siendo TERMINAL**: no vuelve a `instalado` ni a `en_stock` por esta via.
 *    Lo que existe es `POST .../reactivar`, que es otra accion (y otro permiso).
 *
 * Esto es ergonomia, no autorizacion: quien valida la transicion es el backend, que responde
 * 409 `flota.dispositivo.transicion_stock_invalida` si la UI se equivoca — o
 * 409 `flota.dispositivo.reparacion_con_asignacion_activa` si el destino es `en_reparacion` y el
 * GPS todavia esta instalado (esa transicion SI esta permitida por la matriz; lo que la bloquea es
 * la asignacion vigente).
 */
const DESTINOS_POR_ESTADO: Record<EstadoStockDispositivo, ReadonlyArray<DestinoDeStock>> = {
  en_stock: ['en_reparacion'],
  instalado: ['en_reparacion'],
  en_reparacion: ['en_stock'],
  dado_de_baja: [],
}

export function varianteDeStock(estado: EstadoStockDispositivo): VarianteBadge {
  return VARIANTE_POR_STOCK[estado]
}

export function claveDeStock(estado: EstadoStockDispositivo): string {
  return `estadoStockDispositivo.${estado}`
}

export function destinosDeStock(
  estadoActual: EstadoStockDispositivo,
): ReadonlyArray<DestinoDeStock> {
  return DESTINOS_POR_ESTADO[estadoActual]
}
