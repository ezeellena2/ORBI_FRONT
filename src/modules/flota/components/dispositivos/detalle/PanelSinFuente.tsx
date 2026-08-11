import type { LucideIcon } from 'lucide-react'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'

/**
 * Panel de un tab cuya superficie TODAVIA NO TIENE FUENTE. Es el estado declarado que `f-06` exige
 * para Telemetria, Historial de stock y Eventos.
 *
 * Lo que este componente existe para EVITAR, que son los tres errores que el paso nombra:
 *  - spinner infinito (una carga que nunca termina porque nadie la disparo),
 *  - tabla vacia (que afirma "no hay eventos", cuando lo cierto es "no hay de donde sacarlos"),
 *  - datos de ejemplo del mockup (que se leen como reales).
 *
 * Por eso NO emite ningun request: el tab dice la verdad sin tocar la red. Y por eso usa
 * `EstadoVacio` y no `EstadoError`: "esto llega mas adelante" no es una falla, y pintarlo de rojo
 * mandaria a soporte a investigar algo que funciona como esta previsto.
 */
export function PanelSinFuente({
  icono,
  titulo,
  descripcion,
}: {
  icono: LucideIcon
  /** Ya resueltos por i18n. */
  titulo: string
  descripcion: string
}) {
  return (
    <EstadoVacio variante="sin-datos" icono={icono} titulo={titulo} descripcion={descripcion} />
  )
}
