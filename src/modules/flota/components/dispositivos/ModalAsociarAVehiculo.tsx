import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Modal } from '@/shared/ui/Modal'
import type { DispositivoListItemDto } from '@/services/contracts/flota'
import { flotaKeysAfectadasPorAsignacion } from '../../query-keys'
import { useInstalarDispositivoEnVehiculo } from '../../hooks/useInstalarDispositivoEnVehiculo'
import {
  asignarVehiculoADispositivoSchema,
  VALORES_INICIALES_ASIGNAR_VEHICULO,
  type AsignarVehiculoADispositivoFormulario,
} from '../../schemas/asignar-dispositivo'
import { SelectorVehiculo } from '../conductores/SelectorVehiculo'
import { AvisoErrorAsignacion } from './AvisoErrorAsignacion'

/**
 * Modal "Asignar a un vehiculo" — el mismo `POST /api/flota/vehiculos/{id}/asignaciones/dispositivo`
 * y el mismo permiso `flota.vehiculos.asignar-dispositivo` que `ModalAsociarDispositivo`, **visto
 * desde el inventario**: acá el GPS ya esta elegido y falta el vehiculo (ficha §7, `f-07` §6).
 *
 * ── POR QUE APARECE RECIEN AHORA ──────────────────────────────────────────────────────────────
 * Esta accion existia en el kebab del listado **deshabilitada**, y el motivo escrito era que el
 * filtro `situacion` de `GET /vehiculos` no estaba implementado: sin el, la lista de candidatos era
 * "todos los vehiculos" y no habia forma de saber cuales tenian GPS —
 * `VehiculoListItemDto.dispositivo` viene `null` en el 100% de las respuestas y sigue viniendo—.
 *
 * Ese motivo quedo **vencido el 2026-08-12**: slice-05 `f-02` implemento `situacion` con sus 4
 * valores, `EXISTS`/`NOT EXISTS` intra-schema. Y de los 4, `sin_dispositivo_gps` describe **exacto**
 * a los candidatos de esta operacion, porque el vinculo vehiculo↔GPS es **1:1**: ni recorta
 * candidatos validos ni deja pasar ocupados. Es la unica de las dos asignaciones que se puede
 * pre-filtrar sin mentir (la de conductor no — ver `SelectorVehiculo`).
 *
 * ── LO QUE ESTE MODAL NO HACE, A DIFERENCIA DE SU GEMELO ──────────────────────────────────────
 * **No reasigna.** Solo se abre sobre un equipo `en_stock` (lo gatea el kebab) y la lista trae solo
 * vehiculos sin GPS, asi que no hay ningun equipo saliente que avisar: el `reasignaAviso` del gemelo
 * no tiene caso acá. Si aun asi el vehiculo dejo de estar libre entre el `GET` y el `POST`, el
 * backend resuelve —cierra la anterior con `motivo_cierre = reasignacion` (D-S3-14)— y la fila del
 * saliente vuelve a `en_stock`: la invalidacion de los 2 prefijos lo deja a la vista.
 *
 * ── EL ERROR NO CIERRA EL MODAL ───────────────────────────────────────────────────────────────
 * Solo `onSuccess` cierra. `AvisoErrorAsignacion` es el mismo de las otras 3 superficies —tiene que
 * decir exactamente lo mismo—: `flota.dispositivo.canonico_no_coordinable` (500) ofrece reintentar
 * porque no quedo nada escrito, y los 409 de negocio ofrecen actualizar, porque reintentar lo mismo
 * vuelve a fallar.
 */
export function ModalAsociarAVehiculo({
  dispositivo,
  abierto,
  onCerrar,
}: {
  dispositivo: DispositivoListItemDto | null
  abierto: boolean
  onCerrar: () => void
}) {
  // Montado solo mientras esta abierto: la seleccion arranca vacia en cada apertura y el error del
  // intento anterior no reaparece en el siguiente.
  if (!abierto || dispositivo === null) return null

  return <Formulario dispositivo={dispositivo} onCerrar={onCerrar} />
}

function Formulario({
  dispositivo,
  onCerrar,
}: {
  dispositivo: DispositivoListItemDto
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const queryClient = useQueryClient()

  const form = useForm<AsignarVehiculoADispositivoFormulario>({
    resolver: zodResolver(asignarVehiculoADispositivoSchema),
    defaultValues: VALORES_INICIALES_ASIGNAR_VEHICULO,
  })

  /*
    El vehiculo se elige DENTRO del formulario, asi que viaja como variable de la mutation y no en la
    firma del hook (por eso no es `useAsignarDispositivo`, que lo toma en la firma). Leerlo con
    `form.watch()` para pasarlo a la firma es lo que el React Compiler rechaza — ver el hook.
  */
  const mutacion = useInstalarDispositivoEnVehiculo()

  const enviar = form.handleSubmit((valores) => {
    // El body es el del contrato y no cambia por el sentido de la pantalla: `{ dispositivoFlotaId }`.
    // El `vehiculoFlotaId` va a la URL.
    mutacion.mutate(
      { vehiculoFlotaId: valores.vehiculoFlotaId, dispositivoFlotaId: dispositivo.id },
      {
        onSuccess: () => {
          mutacion.reset()
          onCerrar()
        },
      },
    )
  })

  // Lo que arregla un 409 de negocio no es reintentar: es volver a mirar. Refresca inventario y
  // vehiculos, y el selector se repuebla solo.
  const actualizar = () => {
    for (const key of flotaKeysAfectadasPorAsignacion()) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
    mutacion.reset()
  }

  const errorSeleccion = form.formState.errors.vehiculoFlotaId?.message

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      titulo={t('flota:asignacionAVehiculo.titulo')}
      // Sobre que equipo se esta operando. `alias` es nullable (D-S3-12): sin el, la identidad
      // visible es el IMEI, que siempre esta.
      descripcion={dispositivo.alias ?? dispositivo.imei}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:asignacionAVehiculo.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {mutacion.isPending
              ? t('flota:asignacionAVehiculo.asignando')
              : t('flota:asignacionAVehiculo.asignar')}
          </Boton>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void enviar()
        }}
      >
        {mutacion.error ? (
          <AvisoErrorAsignacion
            error={mutacion.error}
            onReintentar={() => void enviar()}
            onActualizar={actualizar}
          />
        ) : null}

        <p className="text-sm text-fg-secundario">{t('flota:asignacionAVehiculo.descripcion')}</p>

        <Controller
          control={form.control}
          name="vehiculoFlotaId"
          render={({ field }) => (
            <Campo
              etiqueta={t('flota:asignacionAVehiculo.vehiculo')}
              error={
                errorSeleccion === undefined
                  ? undefined
                  : t(errorSeleccion, { defaultValue: errorSeleccion })
              }
              requerido
            >
              {(control) => (
                <SelectorVehiculo
                  control={control}
                  valor={field.value}
                  onCambio={field.onChange}
                  deshabilitado={mutacion.isPending}
                  soloSinDispositivoGps
                  accionSinVehiculos={
                    <Boton
                      variante="secundaria"
                      tamano="sm"
                      render={<Link to="/app/flota/vehiculos" />}
                    >
                      {t('flota:asignacionVehiculo.sinDisponiblesCta')}
                    </Boton>
                  }
                />
              )}
            </Campo>
          )}
        />
      </form>
    </Modal>
  )
}
