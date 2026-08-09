import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DialogoConfirmacion } from '@/shared/ui/DialogoConfirmacion'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { VehiculoDetalleDto } from '@/services/contracts/flota'
import { useEliminarVehiculo } from '../../hooks/useEliminarVehiculo'

/**
 * Baja LÓGICA del vehículo (DA-VD-12: no existe hard-delete en v1).
 *
 * Dos correcciones del mockup, las dos del contrato:
 *  1. El copy NO dice "no se puede deshacer" — es una baja lógica. Dice lo que realmente pasa:
 *     el vehículo deja de aparecer en listados y mapa.
 *  2. NO promete "se desasignará su dispositivo y conductor". Con una asignación activa el backend
 *     BLOQUEA con 409 `flota.vehiculo.baja_con_asignaciones_activas` y hay que desasignar primero.
 *     (En este slice ese 409 todavía no puede dispararse: las asignaciones llegan en 03/04. La rama
 *     se implementa igual porque el día que exista no se toca esta pantalla.)
 *
 * Se conserva la confirmación por tipeo de la patente EXACTA: es lo que separa "cancelar por error"
 * de "cancelar a propósito".
 */
export function ModalBajaVehiculo({
  vehiculo,
  abierto,
  onCerrar,
}: {
  vehiculo: VehiculoDetalleDto
  abierto: boolean
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const navigate = useNavigate()
  const mutacion = useEliminarVehiculo()

  const apiError = mutacion.error ? parseApiError(mutacion.error) : null

  const descripcion = (() => {
    if (apiError === null) return t('flota:detalle.baja.descripcion')
    if (apiError.code === 'flota.vehiculo.baja_con_asignaciones_activas') {
      return t('flota:detalle.baja.bloqueadaPorAsignaciones')
    }
    return resolveApiErrorMessage(apiError, t)
  })()

  // Sin patente vigente no hay valor exacto que tipear (la proyección canónica puede no estar
  // vigente y el DTO la sirve en `null`). Se degrada a la confirmación de peligro simple en vez de
  // dejar el botón deshabilitado para siempre sin decir por qué.
  const puedeConfirmarPorTipeo = vehiculo.patente !== null

  return (
    <DialogoConfirmacion
      abierto={abierto}
      onCerrar={() => {
        mutacion.reset()
        onCerrar()
      }}
      onConfirmar={() =>
        mutacion.mutate(vehiculo.id, {
          onSuccess: () => navigate('/app/flota/vehiculos'),
        })
      }
      variante={puedeConfirmarPorTipeo ? 'peligro-con-tipeo' : 'peligro'}
      titulo={t('flota:detalle.baja.titulo')}
      descripcion={descripcion}
      etiquetaTipeo={t('flota:detalle.baja.etiquetaTipeo')}
      valorEsperado={vehiculo.patente ?? undefined}
      textoConfirmar={t('flota:detalle.baja.confirmar')}
      textoCancelar={t('flota:comun.cancelar')}
      cargando={mutacion.isPending}
    />
  )
}
