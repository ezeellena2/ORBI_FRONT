import { useTranslation } from 'react-i18next'
import { BadgeConexion } from '../BadgeConexion'
import type { EstadoConexion } from '@/services/contracts/flota'

/**
 * Badge del estado de CONEXION del vehiculo (`EstadoConexion` del contrato).
 *
 * Es un envoltorio fino de `BadgeConexion`, que es el badge del modulo: variante, etiqueta y ayuda
 * salen del mismo lugar que en dispositivos y en el mapa, asi que las 3 superficies pintan el mismo
 * codigo igual. Lo unico propio del vehiculo es la regla de la velocidad.
 *
 * Antes este componente tenia su propia copia del `Record<EstadoConexion, VarianteBadge>` y su
 * propia composicion del `title`: asi es como se desincronizan dos verdades — el vocabulario cambia
 * de criterio y `sin_dato` vuelve a pintarse de rojo en un solo lugar de la pantalla.
 */

export interface VehiculoBadgeEstadoProps {
  estado: EstadoConexion
  /**
   * De `ultimaSenal.velocidadKmH`. Solo se muestra con el vehiculo en linea: una velocidad al lado
   * de "Desconectado" o "Sin dato" seria un dato viejo presentado como actual.
   */
  velocidadKmH?: number | null
}

export function VehiculoBadgeEstado({ estado, velocidadKmH }: VehiculoBadgeEstadoProps) {
  const { t } = useTranslation('flota')

  const muestraVelocidad =
    estado === 'en_linea' && velocidadKmH !== null && velocidadKmH !== undefined

  return (
    <BadgeConexion
      estado={estado}
      sufijo={
        muestraVelocidad
          ? t('vehiculosListado.celda.velocidad', { velocidad: velocidadKmH })
          : null
      }
    />
  )
}
