import { useTranslation } from 'react-i18next'
import { DialogoConfirmacion } from '@/shared/ui/DialogoConfirmacion'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { ConductorListItemDto } from '@/services/contracts/flota'
import { useBajaConductor } from '../../hooks/useBajaConductor'
import { useEliminarConductor } from '../../hooks/useEliminarConductor'
import { useReactivarConductor } from '../../hooks/useReactivarConductor'

/**
 * Los 3 dialogos que mueven el flag `activo` del conductor. Viven juntos porque comparten forma
 * (confirmacion + mensaje del error de negocio sin cerrar) y **se distinguen por lo que arriesgan**:
 *
 * | Dialogo | Endpoint | Permiso | ¿Se puede deshacer? |
 * |---|---|---|---|
 * | Desactivar | `POST .../baja` | `flota.conductores.eliminar` | **si**, con Reactivar |
 * | Reactivar | `POST .../reactivar` | `flota.conductores.editar` ⚠️ | — |
 * | Eliminar definitivamente | `DELETE .../{id}` | `flota.conductores.eliminar` | **NO** |
 *
 * ⚠️ La fila del medio es la que **no sigue la intuicion** (P-F de `permisos.md`): reactivar pide
 * `editar` y dar de baja pide `eliminar`, asi que un usuario puede poder reactivar y no poder dar de
 * baja. Esta transcripta tal cual, no "corregida".
 *
 * En los 3, un error de negocio **NO cierra el dialogo**: se muestra en su descripcion, traducido
 * por `message_key`. Cerrar en verde sobre un rechazo deja la fila igual y sin explicacion.
 */

/**
 * Nombre con el que se le habla al usuario de este conductor.
 *
 * Puede no haber ninguno: `nombreCompleto` y `dni` son proyeccion canonica y el gate de PII del
 * `find-or-create` hace que `null` sea el caso normal. Se cae al legajo y, si tampoco hay, se usa un
 * texto neutro — nunca "null" ni un hueco en medio de una frase.
 */
function useNombreDe(conductor: ConductorListItemDto | null): string {
  const { t } = useTranslation('flota')
  return (
    conductor?.nombreCompleto ??
    conductor?.dni ??
    conductor?.numeroLegajo ??
    t('conductoresListado.celda.sinNombre')
  )
}

export function DialogoBajaConductor({
  conductor,
  abierto,
  onCerrar,
}: {
  conductor: ConductorListItemDto | null
  abierto: boolean
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useBajaConductor()
  const nombre = useNombreDe(conductor)

  const error = mutacion.error ? resolveApiErrorMessage(parseApiError(mutacion.error), t) : null

  /*
    ⚠️ EL COPY NO PROMETE QUE DESASIGNA. `api.md` describe la baja como "desasigna vehiculo activo",
    pero `errores.md` define `flota.conductor.baja_con_asignacion_activa` (409) que la BLOQUEA, y el
    backend resolvio el drift a favor de `errores.md` (el dueno de los codes), dejandolo reportado
    para el PO. Hasta que el PO decida, la UI dice lo que el backend hace: pide desasignar primero.

    Tampoco se promete "revoca acceso movil": el acceso es de Access/Canonica y Flota no escribe esos
    schemas.
  */
  const descripcion = [
    t('flota:conductorBaja.descripcion', { nombre }),
    t('flota:conductorBaja.noDesasigna'),
  ].join(' ')

  return (
    <DialogoConfirmacion
      abierto={abierto && conductor !== null}
      onCerrar={() => {
        mutacion.reset()
        onCerrar()
      }}
      onConfirmar={() => {
        if (conductor === null) return
        mutacion.mutate(conductor.id, {
          onSuccess: () => {
            mutacion.reset()
            onCerrar()
          },
        })
      }}
      variante="peligro"
      titulo={t('flota:conductorBaja.titulo')}
      descripcion={error ?? descripcion}
      textoConfirmar={t('flota:conductorBaja.confirmar')}
      textoCancelar={t('flota:comun.cancelar')}
      cargando={mutacion.isPending}
    />
  )
}

export function DialogoReactivarConductor({
  conductor,
  abierto,
  onCerrar,
}: {
  conductor: ConductorListItemDto | null
  abierto: boolean
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useReactivarConductor()
  const nombre = useNombreDe(conductor)

  const error = mutacion.error ? resolveApiErrorMessage(parseApiError(mutacion.error), t) : null

  // La reactivacion NO resetea el estado operativo (es la contracara de que la baja no lo movio): un
  // conductor que se dio de baja estando `suspendido` vuelve `suspendido`. El copy lo dice para que
  // nadie asuma que vuelve "listo para asignar".
  const descripcion = [
    t('flota:conductorReactivar.descripcion', { nombre }),
    t('flota:conductorReactivar.noResetaEstado'),
  ].join(' ')

  return (
    <DialogoConfirmacion
      abierto={abierto && conductor !== null}
      onCerrar={() => {
        mutacion.reset()
        onCerrar()
      }}
      onConfirmar={() => {
        if (conductor === null) return
        mutacion.mutate(conductor.id, {
          onSuccess: () => {
            mutacion.reset()
            onCerrar()
          },
        })
      }}
      titulo={t('flota:conductorReactivar.titulo')}
      descripcion={error ?? descripcion}
      textoConfirmar={t('flota:conductorReactivar.confirmar')}
      textoCancelar={t('flota:comun.cancelar')}
      cargando={mutacion.isPending}
    />
  )
}

export function DialogoEliminarConductor({
  conductor,
  abierto,
  onCerrar,
  onEliminado,
}: {
  conductor: ConductorListItemDto | null
  abierto: boolean
  onCerrar: () => void
  /**
   * Se llama DESPUES del 204, y solo lo pasa la superficie que queda en una URL muerta al borrar
   * (la ficha, que navega al listado). El listado NO lo pasa: ahí quedarse y ver la fila desaparecer
   * es el resultado de la acción.
   */
  onEliminado?: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useEliminarConductor()
  const nombre = useNombreDe(conductor)

  const error = mutacion.error ? resolveApiErrorMessage(parseApiError(mutacion.error), t) : null

  /*
    HARD-DELETE: la fila desaparece y no vuelve. Se pide tipear el nombre exacto, igual que en
    vehiculos y dispositivos.

    Sin nombre proyectado (gate de PII) no hay valor exacto que tipear: se degrada a la confirmacion
    `peligro` en vez de pedir que escriban un texto de fallback, que seria un tipeo sin sentido.
  */
  const valorEsperado = conductor?.nombreCompleto ?? conductor?.dni ?? undefined

  return (
    <DialogoConfirmacion
      abierto={abierto && conductor !== null}
      onCerrar={() => {
        mutacion.reset()
        onCerrar()
      }}
      onConfirmar={() => {
        if (conductor === null) return
        mutacion.mutate(conductor.id, {
          onSuccess: () => {
            mutacion.reset()
            onCerrar()
            onEliminado?.()
          },
        })
      }}
      variante={valorEsperado === undefined ? 'peligro' : 'peligro-con-tipeo'}
      titulo={t('flota:conductorEliminar.titulo')}
      descripcion={error ?? t('flota:conductorEliminar.descripcion', { nombre })}
      etiquetaTipeo={t('flota:conductorEliminar.etiquetaTipeo', { valor: valorEsperado ?? '' })}
      valorEsperado={valorEsperado}
      textoConfirmar={t('flota:conductorEliminar.confirmar')}
      textoCancelar={t('flota:conductorEliminar.cancelar')}
      cargando={mutacion.isPending}
    />
  )
}
