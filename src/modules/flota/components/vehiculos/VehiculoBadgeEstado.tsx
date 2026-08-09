import { useTranslation } from 'react-i18next'
import type { EstadoConexion } from '@/services/contracts/flota'
import { Badge, type VarianteBadge } from '@/shared/ui/Badge'

/**
 * Badge del estado de CONEXION del vehiculo (`EstadoConexion` del contrato).
 *
 * Esta es la "capa 2" que la primitiva `Badge` deja a proposito afuera: el mapeo
 * `codigo de catalogo -> variante + etiqueta` vive en el modulo, no en la primitiva.
 *
 * El codigo viaja SIEMPRE en snake_case (D-7) y solo se traduce para mostrarlo: nada de lo que
 * se ve aca cambia el valor que el front le manda al backend.
 *
 * `sin_dato` es el fallback de partial-data (D-C1 a): Telemetria no respondio o el vehiculo aun
 * no tiene fuente. No es un error de pantalla — el resto de la fila se sigue viendo.
 */

const variantePorEstado: Record<EstadoConexion, VarianteBadge> = {
  en_linea: 'exito',
  desconectado: 'peligro',
  incompleto: 'advertencia',
  sin_dato: 'neutro',
}

export interface VehiculoBadgeEstadoProps {
  estado: EstadoConexion
  /** De `ultimaSenal.velocidadKmH`. Solo se muestra con el vehiculo en linea. */
  velocidadKmH?: number | null
}

export function VehiculoBadgeEstado({ estado, velocidadKmH }: VehiculoBadgeEstadoProps) {
  const { t } = useTranslation('flota')

  const etiqueta = t(`estadoConexion.${estado}`, { defaultValue: estado })
  const muestraVelocidad = estado === 'en_linea' && velocidadKmH !== null && velocidadKmH !== undefined

  return (
    <Badge variante={variantePorEstado[estado]} punto>
      {muestraVelocidad
        ? `${etiqueta} · ${t('vehiculosListado.celda.velocidad', { velocidad: velocidadKmH })}`
        : etiqueta}
    </Badge>
  )
}
