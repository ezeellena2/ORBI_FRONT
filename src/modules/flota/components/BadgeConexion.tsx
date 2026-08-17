import { useTranslation } from 'react-i18next'
import {
  claveDeAyudaDeConexion,
  claveDeConexion,
  varianteDeConexion,
} from '../vocabulario-conexion'
import type { EstadoConexion } from '@/services/contracts/flota'
import { Badge } from '@/shared/ui/Badge'

/**
 * El badge de CONEXION del modulo. Uno solo para los 3 listados, la ficha y el mapa.
 *
 * Es la pieza que hace que las pantallas se lean como una sola familia: el mismo codigo se pinta con
 * la misma variante, la misma etiqueta y la misma ayuda en cualquier superficie. El mapeo no vive
 * aca —vive en `modules/flota/vocabulario-conexion.ts`, que tiene los tests—; este componente
 * solo dibuja.
 *
 * ── LO QUE ESTE BADGE TIENE QUE IMPEDIR ───────────────────────────────────────────────────────
 * Que el usuario lea `sin_dato` como "desconectado". No son lo mismo:
 *  - `desconectado` es una AFIRMACION del upstream (venia reportando y dejo de hacerlo; el umbral de
 *    5 min lo decide Telemetria, Flota no recalcula offline);
 *  - `sin_dato` es la AUSENCIA de fila upstream — el equipo nunca reporto, no hay GPS instalado, o
 *    Telemetria no respondio y entonces TODA la flota cae ahi (partial-data, D-C1 a).
 *
 * Por eso `sin_dato` es NEUTRO y no `peligro`, y por eso el badge SIEMPRE lleva su linea de ayuda:
 * la etiqueta sola ("Sin dato") no alcanza para que alguien entienda que no tiene que llamar al
 * proveedor de GPS.
 *
 * El codigo viaja SIEMPRE en snake_case (D-7) y solo se traduce para mostrarlo.
 */

export interface BadgeConexionProps {
  estado: EstadoConexion
  /**
   * Clave i18n de la ayuda. Por default la del **vehiculo**; el listado de dispositivos pasa la de
   * `claveDeAyudaDeConexionDeEquipo`, donde `sin_dato` significa otra cosa (un equipo sin instalar
   * no reporta, y eso es lo esperable).
   */
  claveAyuda?: string
  /**
   * Texto YA resuelto que se concatena a la etiqueta ("En linea · 45 km/h"). Quien lo pasa decide
   * cuando: un dato en vivo al lado de "Desconectado" o "Sin dato" seria un valor viejo presentado
   * como actual.
   */
  sufijo?: string | null
}

export function BadgeConexion({ estado, claveAyuda, sufijo }: BadgeConexionProps) {
  const { t } = useTranslation('flota')

  const etiqueta = t(claveDeConexion(estado), { defaultValue: estado })
  const ayuda = t(claveAyuda ?? claveDeAyudaDeConexion(estado), { defaultValue: '' })

  return (
    <Badge variante={varianteDeConexion(estado)} punto title={ayuda === '' ? undefined : ayuda}>
      {sufijo === null || sufijo === undefined || sufijo === '' ? etiqueta : `${etiqueta} · ${sufijo}`}
    </Badge>
  )
}
