import { useTranslation } from 'react-i18next'
import { DialogoConfirmacion } from '@/shared/ui/DialogoConfirmacion'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { DispositivoDetalleDto } from '@/services/contracts/flota'
import { useBajaDispositivo } from '../../../hooks/useBajaDispositivo'

/**
 * Baja del dispositivo — `POST .../baja`, permiso `flota.dispositivos.eliminar`.
 *
 * Tres decisiones del contrato que se ven en el copy y en el comportamiento:
 *
 *  1. **Es baja LOGICA Y COHERENTE**: `activo = false` + `estado_stock = 'dado_de_baja'` en la misma
 *     transaccion. El dispositivo no desaparece.
 *  2. **Es REVERSIBLE** (`POST .../reactivar`), asi que el copy NO dice "no se puede deshacer" —
 *     seria falso, y el `confirm()` nativo del mockup que lo insinuaba no se porta.
 *  3. **Se BLOQUEA con 409 si esta instalado** (`flota.dispositivo.baja_con_asignacion_activa`):
 *     primero hay que desasociarlo del vehiculo. Cuando eso pasa, el dialogo NO se cierra: muestra
 *     el motivo real y deja al usuario decidir. Cerrar en verde sobre un 409 es exactamente el bug
 *     que el criterio de verificacion del paso busca.
 *
 * Se pide tipear el ALIAS exacto por el mismo motivo que la patente en la baja de vehiculo: es lo
 * que separa "cancelar por error" de "cancelar a proposito". ⚠️ El alias es NULLABLE (D-S3-12) y NO
 * es unico (D-S3-34, B-15): sin alias no hay valor exacto que pedir, asi que el dialogo se degrada a
 * la confirmacion simple en vez de pedir que el usuario escriba "—".
 */
export function ModalBajaDispositivo({
  dispositivo,
  abierto,
  onCerrar,
}: {
  dispositivo: DispositivoDetalleDto
  abierto: boolean
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useBajaDispositivo(dispositivo.id)

  const apiError = mutacion.error ? parseApiError(mutacion.error) : null

  // Cuando el backend bloquea la baja, la descripción del diálogo se REEMPLAZA por el motivo real
  // (típicamente el 409 `flota.dispositivo.baja_con_asignacion_activa`). El copy de ese error vive
  // UNA sola vez, en el catálogo de `common.json`, y se resuelve por `message_key` / `errors.<code>`.
  const descripcion =
    apiError === null
      ? t('flota:dispositivoDetalle.baja.descripcion')
      : resolveApiErrorMessage(apiError, t)

  return (
    <DialogoConfirmacion
      abierto={abierto}
      onCerrar={() => {
        mutacion.reset()
        onCerrar()
      }}
      // No se navega a ningun lado despues de la baja, a diferencia del vehiculo: el dispositivo
      // sigue existiendo y la ficha se queda mostrandolo en `dado_de_baja`, con "Reactivar"
      // disponible en el kebab. Sacar al usuario de la pantalla le escondería el resultado.
      onConfirmar={() => mutacion.mutate(undefined, { onSuccess: onCerrar })}
      // `alias` es nullable (D-S3-12) y sin el no hay valor exacto que pedir tipear: se degrada a
      // la confirmacion simple en vez de pedir que el usuario escriba "—".
      variante={dispositivo.alias === null ? 'peligro' : 'peligro-con-tipeo'}
      titulo={t('flota:dispositivoDetalle.baja.titulo')}
      descripcion={descripcion}
      etiquetaTipeo={t('flota:dispositivoDetalle.baja.etiquetaTipeo')}
      valorEsperado={dispositivo.alias ?? undefined}
      textoConfirmar={t('flota:dispositivoDetalle.baja.confirmar')}
      textoCancelar={t('flota:comun.cancelar')}
      cargando={mutacion.isPending}
    />
  )
}
