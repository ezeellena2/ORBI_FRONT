import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Modal } from '@/shared/ui/Modal'
import type { AsignacionVehiculoDispositivoDto } from '@/services/contracts/flota'
import { flotaKeysAfectadasPorAsignacion } from '../../query-keys'
import { useAsignarDispositivo } from '../../hooks/useAsignarDispositivo'
import {
  aAsignarDispositivoRequest,
  asignarDispositivoSchema,
  VALORES_INICIALES_ASIGNAR,
  type AsignarDispositivoFormulario,
} from '../../schemas/asignar-dispositivo'
import { AvisoErrorAsignacion } from './AvisoErrorAsignacion'
import { SelectorDispositivoEnStock } from './SelectorDispositivoEnStock'

/**
 * Modal "Asociar dispositivo GPS" — `POST /api/flota/vehiculos/{id}/asignaciones/dispositivo`,
 * permiso `flota.vehiculos.asignar-dispositivo` (grupo VEHICULOS: asignar es una operacion del
 * vehiculo, no del dispositivo).
 *
 * ── ASOCIAR Y CAMBIAR SON LA MISMA OPERACION ──────────────────────────────────────────────────
 * Reasignar NO es un error ni un flujo aparte: si el vehiculo ya tiene un GPS, el `POST` cierra esa
 * asignacion con `motivo_cierre = reasignacion`, devuelve el saliente a `en_stock` y abre la nueva,
 * todo en una transaccion (D-S3-14). Por eso hay un solo modal, y lo unico que cambia es el aviso de
 * arriba — que se muestra ANTES de confirmar, porque el usuario tiene que saber que va a desinstalar
 * el equipo actual.
 *
 * ── EL ERROR NO CIERRA EL MODAL ───────────────────────────────────────────────────────────────
 * Solo `onSuccess` cierra. Un rechazo deja el modal abierto con la seleccion cargada y el aviso
 * arriba; el aviso de `flota.dispositivo.canonico_no_coordinable` trae ademas su propio boton de
 * reintento, porque en ese caso el backend no persistio nada y reenviar lo mismo es exactamente lo
 * que corresponde (ver `AvisoErrorAsignacion`).
 *
 * ── LA RESPUESTA NO SE DESCARTA ───────────────────────────────────────────────────────────────
 * `onAsignado` recibe el `AsignacionVehiculoDispositivoDto` porque su `asignacionId` es la UNICA
 * fuente del id que el `DELETE` pide en la URL (D-S3-16): `GET /vehiculos/{id}/asignaciones` no esta
 * implementado y `historialAsignaciones` no lo lleva. Un caller que lo tire deja al usuario sin
 * forma de desasociar.
 */
export function ModalAsociarDispositivo({
  vehiculoFlotaId,
  identificacionVehiculo,
  reasigna,
  abierto,
  onCerrar,
  onAsignado,
}: {
  vehiculoFlotaId: string
  /** Patente o alias, ya resuelto. Va en el subtitulo para que se vea sobre que se esta operando. */
  identificacionVehiculo: string
  /** `true` si el vehiculo YA tiene un GPS instalado: el confirmar va a desinstalarlo. */
  reasigna: boolean
  abierto: boolean
  onCerrar: () => void
  onAsignado: (asignacion: AsignacionVehiculoDispositivoDto) => void
}) {
  // Montado solo mientras esta abierto: la seleccion arranca vacia en cada apertura y el error del
  // intento anterior no reaparece en el siguiente.
  if (!abierto) return null

  return (
    <Formulario
      vehiculoFlotaId={vehiculoFlotaId}
      identificacionVehiculo={identificacionVehiculo}
      reasigna={reasigna}
      onCerrar={onCerrar}
      onAsignado={onAsignado}
    />
  )
}

function Formulario({
  vehiculoFlotaId,
  identificacionVehiculo,
  reasigna,
  onCerrar,
  onAsignado,
}: {
  vehiculoFlotaId: string
  identificacionVehiculo: string
  reasigna: boolean
  onCerrar: () => void
  onAsignado: (asignacion: AsignacionVehiculoDispositivoDto) => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const queryClient = useQueryClient()
  const mutacion = useAsignarDispositivo(vehiculoFlotaId)

  const form = useForm<AsignarDispositivoFormulario>({
    resolver: zodResolver(asignarDispositivoSchema),
    defaultValues: VALORES_INICIALES_ASIGNAR,
  })

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aAsignarDispositivoRequest(valores), {
      onSuccess: (asignacion) => {
        mutacion.reset()
        onAsignado(asignacion)
        onCerrar()
      },
    })
  })

  // Lo que arregla un 409 de negocio no es reintentar: es volver a mirar. Refresca inventario y
  // vehiculos, y el selector se repuebla solo.
  const actualizar = () => {
    for (const key of flotaKeysAfectadasPorAsignacion()) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
    mutacion.reset()
  }

  const errorSeleccion = form.formState.errors.dispositivoFlotaId?.message

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      titulo={t('flota:asignacionDispositivo.titulo')}
      descripcion={identificacionVehiculo}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:asignacionDispositivo.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {mutacion.isPending
              ? t('flota:asignacionDispositivo.asignando')
              : t('flota:asignacionDispositivo.asignar')}
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

        <p className="text-sm text-fg-secundario">
          {t('flota:asignacionDispositivo.descripcion')}
        </p>

        {reasigna ? (
          <p className="rounded-lg border border-advertencia/40 bg-advertencia-fondo px-3 py-2 text-xs text-fg-secundario">
            {t('flota:asignacionDispositivo.reasignaAviso')}
          </p>
        ) : null}

        <Controller
          control={form.control}
          name="dispositivoFlotaId"
          render={({ field }) => (
            <Campo
              etiqueta={t('flota:asignacionDispositivo.dispositivo')}
              error={
                errorSeleccion === undefined
                  ? undefined
                  : t(errorSeleccion, { defaultValue: errorSeleccion })
              }
              requerido
            >
              {(control) => (
                <SelectorDispositivoEnStock
                  control={control}
                  valor={field.value}
                  onCambio={field.onChange}
                  deshabilitado={mutacion.isPending}
                  accionSinStock={
                    <Boton
                      variante="secundaria"
                      tamano="sm"
                      render={<Link to="/app/flota/dispositivos" />}
                    >
                      {t('flota:asignacionDispositivo.sinDisponiblesCta')}
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
