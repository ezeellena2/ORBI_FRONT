import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { MotivoCierreAsignacion } from '@/services/contracts/flota'
import { AvisoErrorAsignacionConductor } from './AvisoErrorAsignacionConductor'
import { AvisoOperacion } from '../AvisoOperacion'
import { useCerrarVinculoDispositivoConductor } from '../../hooks/useCerrarVinculoDispositivoConductor'
import { useDesasignarConductor } from '../../hooks/useDesasignarConductor'

/**
 * Los 2 cierres de vinculo del conductor. Comparten forma (confirmacion + `motivo` opcional del
 * catalogo) y por eso viven juntos, pero pegan contra endpoints distintos y con permisos distintos:
 *
 * | Modal | Endpoint | Permiso |
 * |---|---|---|
 * | Quitar vehiculo | `DELETE /vehiculos/{vehiculoFlotaId}/asignaciones/conductor/{asignacionId}` | `flota.vehiculos.asignar-conductor` |
 * | Desvincular dispositivo | `DELETE /conductores/{id}/dispositivos/{asignacionId}` | `flota.conductores.asignar-dispositivo` |
 *
 * ── `motivo` ES UN CODIGO DE CATALOGO, NO TEXTO LIBRE ─────────────────────────────────────────
 * Escribe `motivo_cierre`, que es FK a `motivos_cierre_asignacion_flota`. Un texto libre reventaria
 * contra la FK como 500; el Validator lo acota a los 4 codigos con
 * `validation.motivo.invalid`. El body entero es **opcional**: sin motivo, el backend cierra con
 * `otro`, asi que "sin especificar" es una opcion legitima y no un campo sin completar.
 *
 * ── CERRAR DOS VECES NO ES UN BUG DE LA PANTALLA ──────────────────────────────────────────────
 * Devuelve 404 `flota.asignacion.no_existe` (el contrato no tiene un 409 para "esto ya paso"): otro
 * ya lo cerro. El mensaje se muestra tal cual, sin inventar una explicacion mas amable que seria
 * falsa.
 */

/** Los 4 codigos del catalogo, en orden de lectura. `''` = sin especificar (el backend usa `otro`). */
const MOTIVOS: MotivoCierreAsignacion[] = ['reasignacion', 'reparacion', 'baja', 'otro']

function useOpcionesMotivo() {
  const { t } = useTranslation('flota')

  return [
    { valor: '', etiqueta: t('conductorDetalle.asignaciones.motivoSinEspecificar') },
    ...MOTIVOS.map((valor) => ({ valor, etiqueta: t(`motivoCierreAsignacion.${valor}`) })),
  ]
}

/**
 * Lo MINIMO que hace falta para construir la URL del `DELETE`, y nada mas.
 *
 * Se declara acá en vez de pedir un DTO completo porque la asignacion vigente llega por DOS caminos
 * con shapes distintos, uno por cada superficie que puede quitarla:
 *  - la ficha del CONDUCTOR la lee del historial (`AsignacionConductorHistorialDto`);
 *  - la ficha del VEHICULO solo tiene la respuesta del `POST` de esta sesion
 *    (`AsignacionVehiculoConductorDto`), porque del lado del vehiculo no hay `GET` que la exponga
 *    (B-19 + `conductoresAsignados` vacio siempre).
 * Los dos tienen estos 2 campos y ninguno de los otros hace falta acá.
 */
export interface AsignacionConductorACerrar {
  asignacionId: string
  /** Id LOCAL del vehiculo (A-4): es el que va en la URL del `DELETE`, no el canonico. */
  vehiculoFlotaId: string
}

export function ModalDesasignarVehiculo({
  asignacion,
  nombreConductor,
  abierto,
  onCerrar,
  onDesasignado,
}: {
  /** La asignacion VIGENTE. Es la unica fuente del `asignacionId` que el `DELETE` pide en la URL. */
  asignacion: AsignacionConductorACerrar | null
  /** Identidad ya resuelta del conductor que se quita, o el fallback de "sin dato" de la superficie. */
  nombreConductor: string
  abierto: boolean
  onCerrar: () => void
  /**
   * Se llamó al `DELETE` con éxito. La ficha del VEHICULO lo necesita para olvidar la asignacion de
   * sesion: si la recordara, "Quitar" quedaria habilitado apuntando a una asignacion ya cerrada y el
   * siguiente intento daria 404. La ficha del conductor no lo pasa: relee del historial.
   */
  onDesasignado?: () => void
}) {
  if (!abierto || asignacion === null) return null

  return (
    <FormularioDesasignarVehiculo
      asignacion={asignacion}
      nombreConductor={nombreConductor}
      onCerrar={onCerrar}
      onDesasignado={onDesasignado}
    />
  )
}

function FormularioDesasignarVehiculo({
  asignacion,
  nombreConductor,
  onCerrar,
  onDesasignado,
}: {
  asignacion: AsignacionConductorACerrar
  nombreConductor: string
  onCerrar: () => void
  onDesasignado?: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const [motivo, setMotivo] = useState('')
  const opciones = useOpcionesMotivo()
  const mutacion = useDesasignarConductor(asignacion.vehiculoFlotaId)

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      titulo={t('flota:asignacionConductor.desasignarTitulo')}
      descripcion={t('flota:asignacionConductor.desasignarDescripcion', { nombre: nombreConductor })}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton
            variante="peligro"
            cargando={mutacion.isPending}
            onClick={() =>
              mutacion.mutate(
                {
                  asignacionId: asignacion.asignacionId,
                  motivo: motivo === '' ? undefined : (motivo as MotivoCierreAsignacion),
                },
                {
                  onSuccess: () => {
                    mutacion.reset()
                    onDesasignado?.()
                    onCerrar()
                  },
                },
              )
            }
          >
            {t('flota:asignacionConductor.desasignar')}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {mutacion.error ? <AvisoErrorAsignacionConductor error={mutacion.error} /> : null}

        <Campo
          etiqueta={t('flota:asignacionConductor.motivo')}
          ayuda={t('flota:asignacionConductor.motivoAyuda')}
        >
          {(control) => (
            <Select {...control} opciones={opciones} valor={motivo} onCambio={setMotivo} />
          )}
        </Campo>
      </div>
    </Modal>
  )
}

/**
 * Lo minimo que hace falta para cerrar el vinculo y decirle al usuario cual esta cerrando.
 *
 * Se declara acá y no se reusa `AsignacionConductorDispositivoDto` a proposito: los vinculos llegan
 * por DOS caminos con shapes distintos —`ConductorDetalleDto.dispositivosAsignados`
 * (`DispositivoAsignadoConductorDto`) y `GET .../dispositivos`
 * (`AsignacionConductorDispositivoDto`)— y los dos tienen estos 3 campos. Pedir el DTO completo
 * obligaria a la ficha a hacer un request extra para conseguir campos que este modal no usa.
 */
export interface VinculoDispositivoACerrar {
  asignacionId: string
  /** Nullable: sin alias, la identidad real del equipo es el IMEI. */
  alias: string | null
  imei: string
}

export function ModalDesvincularDispositivo({
  conductorId,
  vinculo,
  abierto,
  onCerrar,
}: {
  conductorId: string
  vinculo: VinculoDispositivoACerrar | null
  abierto: boolean
  onCerrar: () => void
}) {
  if (!abierto || vinculo === null) return null

  return (
    <FormularioDesvincular conductorId={conductorId} vinculo={vinculo} onCerrar={onCerrar} />
  )
}

function FormularioDesvincular({
  conductorId,
  vinculo,
  onCerrar,
}: {
  conductorId: string
  vinculo: VinculoDispositivoACerrar
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const [motivo, setMotivo] = useState('')
  const opciones = useOpcionesMotivo()
  const mutacion = useCerrarVinculoDispositivoConductor(conductorId)

  const error = mutacion.error ? resolveApiErrorMessage(parseApiError(mutacion.error), t) : null

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      titulo={t('flota:vinculoDispositivoConductor.cerrarTitulo')}
      // `alias` es nullable: sin el, la identidad real del equipo es el IMEI.
      descripcion={t('flota:vinculoDispositivoConductor.cerrarDescripcion', {
        dispositivo: vinculo.alias ?? vinculo.imei,
      })}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton
            variante="peligro"
            cargando={mutacion.isPending}
            onClick={() =>
              mutacion.mutate(
                {
                  asignacionId: vinculo.asignacionId,
                  motivo: motivo === '' ? undefined : (motivo as MotivoCierreAsignacion),
                },
                {
                  onSuccess: () => {
                    mutacion.reset()
                    onCerrar()
                  },
                },
              )
            }
          >
            {t('flota:vinculoDispositivoConductor.cerrar')}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <AvisoOperacion titulo={error} /> : null}

        <Campo
          etiqueta={t('flota:vinculoDispositivoConductor.motivo')}
          ayuda={t('flota:vinculoDispositivoConductor.motivoAyuda')}
        >
          {(control) => (
            <Select {...control} opciones={opciones} valor={motivo} onCambio={setMotivo} />
          )}
        </Campo>
      </div>
    </Modal>
  )
}
