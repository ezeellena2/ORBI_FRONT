import { useTranslation } from 'react-i18next'
import { Boton } from '@/shared/ui/Boton'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Aviso } from '@/shared/ui/Aviso'
import { tratamientoDeErrorAsignacionConductor } from './vocabulario-conductor-asignacion'

/**
 * El fallo de una asignacion / desasignacion **de conductor**, contado como lo que es.
 *
 * Gemelo de `AvisoErrorAsignacion` (dispositivos) y **no su copia**: los tratamientos son otros
 * porque la asignacion de conductor **no coordina con PlataformaCanonica**, asi que no existe el caso
 * "el backend no persistio nada porque el Canonico no respondio".
 *
 * Vive en un componente propio porque las superficies que asignan conductor (kebab del listado,
 * ficha del conductor y, cuando llegue `f-07`, el tab del vehiculo) tienen que decir EXACTAMENTE lo
 * mismo: si una se queda con el mensaje generico, el usuario de esa pantalla se va creyendo que la
 * asignacion quedo hecha.
 *
 * ── LA RAMIFICACION ES POR `code`, NUNCA POR STATUS ───────────────────────────────────────────
 * Los 3 rechazos de negocio comparten status (409) y piden acciones **opuestas**:
 *  - `elegirOtro` (`suspendido_no_asignable`, `licencia_vencida`): el problema es del CONDUCTOR.
 *    Reintentar con el mismo falla siempre; lo que corresponde es elegir otro o arreglarle el estado.
 *    Ofrecer "Reintentar" acá seria mandar al usuario a un loop.
 *  - `conflicto` (`ya_tiene_principal`): el problema es del OTRO extremo. Sirve actualizar y elegir
 *    otro vehiculo, o el rol `secundario`.
 *  - `noEncontrado` (404 uniforme): no existe, es de otra organizacion, o la asignacion ya estaba
 *    cerrada. No hay reintento util.
 *
 * El generico —incluida la caida de red— **no afirma que no se guardo nada**: un request que nunca
 * volvio pudo haber llegado igual.
 */
export function AvisoErrorAsignacionConductor({
  error,
  onActualizar,
}: {
  error: unknown
  /** Refresca los datos para volver a elegir. No hay "reintentar": ningun caso lo amerita. */
  onActualizar?: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  const apiError = parseApiError(error)
  const mensaje = resolveApiErrorMessage(apiError, t)
  const tratamiento = tratamientoDeErrorAsignacionConductor(apiError.code)

  const explicacion = {
    elegirOtro: t('flota:asignacionConductor.errorElegirOtro'),
    conflicto: t('flota:asignacionConductor.errorConflicto'),
    noEncontrado: t('flota:asignacionConductor.errorNoEncontrado'),
    generico: t('flota:asignacionConductor.errorGenerico'),
  }[tratamiento]

  return (
    <Aviso
      titulo={mensaje}
      mensaje={explicacion}
      trazaId={apiError.traceId}
      accion={
        // `elegirOtro` no ofrece actualizar: la lista no cambia porque el problema es el conductor.
        onActualizar === undefined || tratamiento === 'elegirOtro' ? undefined : (
          <Boton variante="secundaria" tamano="sm" onClick={onActualizar}>
            {t('flota:asignacionConductor.actualizar')}
          </Boton>
        )
      }
    />
  )
}
