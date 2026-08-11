import { useTranslation } from 'react-i18next'
import { DialogoConfirmacion } from '@/shared/ui/DialogoConfirmacion'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { DispositivoDetalleDto } from '@/services/contracts/flota'
import { useReactivarDispositivo } from '../../../hooks/useReactivarDispositivo'

/**
 * Reactivacion del dispositivo (`POST .../reactivar`, permiso `flota.dispositivos.editar`).
 *
 * Variante `normal`, no `peligro`: reactivar no destruye nada. Se confirma igual porque devuelve el
 * equipo al inventario operativo y eso cambia lo que ven el listado y los filtros.
 *
 * El copy dice explicitamente que el dispositivo vuelve al stock y NO a su vehiculo anterior:
 * `dado_de_baja` es terminal en la maquina de stock y volver a `instalado` exige una asignacion
 * nueva. Prometer lo contrario es lo que despues se lee como "la reactivacion no funciono".
 */
export function ModalReactivarDispositivo({
  dispositivo,
  abierto,
  onCerrar,
}: {
  dispositivo: DispositivoDetalleDto
  abierto: boolean
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useReactivarDispositivo(dispositivo.id)

  const apiError = mutacion.error ? parseApiError(mutacion.error) : null

  return (
    <DialogoConfirmacion
      abierto={abierto}
      onCerrar={() => {
        mutacion.reset()
        onCerrar()
      }}
      onConfirmar={() => mutacion.mutate(undefined, { onSuccess: onCerrar })}
      variante="normal"
      titulo={t('flota:dispositivoDetalle.reactivar.titulo')}
      descripcion={
        apiError === null
          ? t('flota:dispositivoDetalle.reactivar.descripcion')
          : resolveApiErrorMessage(apiError, t)
      }
      textoConfirmar={t('flota:dispositivoDetalle.reactivar.confirmar')}
      textoCancelar={t('flota:comun.cancelar')}
      cargando={mutacion.isPending}
    />
  )
}
