import { useTranslation } from 'react-i18next'
import { Boton } from '@/shared/ui/Boton'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { AvisoOperacion } from '../AvisoOperacion'
import { tratamientoDeErrorAsignacion } from './vocabulario-asignacion'

/**
 * El fallo de una asignacion / desasignacion, contado como lo que es.
 *
 * Vive en un componente propio porque las 3 superficies (tab del vehiculo, modal del listado, paso 2
 * del wizard) tienen que decir EXACTAMENTE lo mismo: si una de ellas se queda con el mensaje
 * generico, el usuario de esa pantalla se va creyendo que el GPS quedo instalado.
 *
 * ── EL CASO QUE JUSTIFICA ESTE ARCHIVO ────────────────────────────────────────────────────────
 * `flota.dispositivo.canonico_no_coordinable` (500). El backend coordina con PlataformaCanonica
 * ANTES de persistir (D-S3-13): si esa coordinacion no llega a destino, **no queda nada escrito**.
 * La correlacion dispositivo->vehiculo la posee el Canonico y es lo que hace que Telemetria acepte
 * las posiciones — o sea que un "exito" falso acá no produce ningun error visible despues: el
 * vehiculo simplemente nunca aparece en el mapa (A-3). Por eso este caso dice las tres cosas:
 *   1. no se guardo nada,
 *   2. el equipo NO quedo instalado y el vehiculo no va a reportar posiciones,
 *   3. se puede reintentar tal cual, sin cambiar nada.
 *
 * Los 409 de negocio (`no_disponible`, `ya_tiene_dispositivo`, `conflicto_canonico`,
 * `canonico_inactivo`) NO ofrecen reintentar: reintentar lo mismo vuelve a fallar. Ofrecen
 * actualizar, que es lo que efectivamente cambia el resultado.
 *
 * La ramificacion es por `code`, nunca por status: los dos grupos comparten status y piden acciones
 * opuestas.
 */
export function AvisoErrorAsignacion({
  error,
  onReintentar,
  onActualizar,
}: {
  error: unknown
  /** Reenvia la MISMA operacion. Solo se ofrece cuando reintentar puede funcionar. */
  onReintentar?: () => void
  /** Refresca los datos del vehiculo y del inventario para volver a elegir. */
  onActualizar?: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  const apiError = parseApiError(error)
  const mensaje = resolveApiErrorMessage(apiError, t)
  const tratamiento = tratamientoDeErrorAsignacion(apiError.code)

  if (tratamiento === 'coordinacion') {
    return (
      <AvisoOperacion
        titulo={mensaje}
        mensaje={t('flota:asignacionDispositivo.errorCoordinacion')}
        trazaId={apiError.traceId}
        accion={
          onReintentar === undefined ? undefined : (
            <Boton variante="secundaria" tamano="sm" onClick={onReintentar}>
              {t('flota:comun.reintentar')}
            </Boton>
          )
        }
      />
    )
  }

  if (tratamiento === 'conflicto') {
    return (
      <AvisoOperacion
        titulo={mensaje}
        mensaje={t('flota:asignacionDispositivo.errorConflicto')}
        trazaId={apiError.traceId}
        accion={
          onActualizar === undefined ? undefined : (
            <Boton variante="secundaria" tamano="sm" onClick={onActualizar}>
              {t('flota:asignacionDispositivo.actualizar')}
            </Boton>
          )
        }
      />
    )
  }

  if (tratamiento === 'noEncontrado') {
    return (
      <AvisoOperacion
        titulo={mensaje}
        mensaje={t('flota:asignacionDispositivo.errorNoEncontrado')}
        trazaId={apiError.traceId}
        accion={
          onActualizar === undefined ? undefined : (
            <Boton variante="secundaria" tamano="sm" onClick={onActualizar}>
              {t('flota:asignacionDispositivo.actualizar')}
            </Boton>
          )
        }
      />
    )
  }

  /*
    Generico — incluye la caida de red. NO afirma que no se guardo nada: un request que nunca volvio
    pudo haber llegado igual, y prometer lo contrario seria el mismo error que este archivo existe
    para evitar, con el signo cambiado.
  */
  return (
    <AvisoOperacion
      titulo={mensaje}
      mensaje={t('flota:asignacionDispositivo.errorGenerico')}
      trazaId={apiError.traceId}
      accion={
        onActualizar === undefined ? undefined : (
          <Boton variante="secundaria" tamano="sm" onClick={onActualizar}>
            {t('flota:asignacionDispositivo.actualizar')}
          </Boton>
        )
      }
    />
  )
}
