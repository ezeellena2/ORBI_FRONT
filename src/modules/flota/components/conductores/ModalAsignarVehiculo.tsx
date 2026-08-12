import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { GrupoRadio } from '@/shared/ui/GrupoRadio'
import { Modal } from '@/shared/ui/Modal'
import type { ConductorListItemDto } from '@/services/contracts/flota'
import { AvisoErrorAsignacionConductor } from './AvisoErrorAsignacionConductor'
import { SelectorVehiculo } from './SelectorVehiculo'
import { useAsignarConductor } from '../../hooks/useAsignarConductor'
import {
  aAsignarConductorRequest,
  asignarVehiculoConductorSchema,
  valoresInicialesAsignarVehiculo,
  type AsignarVehiculoConductorFormulario,
} from '../../schemas/asignar-vehiculo-conductor'

/**
 * Modal "Asignar vehiculo" **visto desde el conductor** (`f-05` §4 / `f-06` §9).
 *
 * ⚠️ EL ENDPOINT CUELGA DEL VEHICULO:
 * `POST /api/flota/vehiculos/{vehiculoFlotaId}/asignaciones/conductor`, permiso
 * **`flota.vehiculos.asignar-conductor`** (grupo VEHICULOS, no conductores). Por eso el hook se
 * construye con el `vehiculoFlotaId` ELEGIDO, no con el del conductor — y por eso el modal se monta
 * en dos capas: la de afuera elige el vehiculo, la de adentro conoce el id y puede crear la mutation.
 *
 * ── LOS ERRORES SE RAMIFICAN POR `code`, NUNCA POR STATUS ─────────────────────────────────────
 * Los 3 rechazos de negocio son 409 y piden acciones OPUESTAS del usuario
 * (`vocabulario-conductor-asignacion.ts`):
 *  - `suspendido_no_asignable` / `licencia_vencida` → **elegir otro conductor** o arreglarle el
 *    estado: reintentar con el mismo falla siempre.
 *  - `ya_tiene_principal` → el problema es del VEHICULO: sirve elegir otro vehiculo o el rol
 *    `secundario`.
 *  - 404 → el recurso no existe o es de otra organizacion; no hay reintento util.
 *
 * ── LO QUE NO SE PROMETE ──────────────────────────────────────────────────────────────────────
 *  - **No se le avisa al conductor.** La asignacion **no coordina con PlataformaCanonica** (B-20,
 *    abierta): `vehiculo_conductores` no se entera, el Canonico sigue diciendo "no hay principal" y
 *    **Notificaciones no manda nada**. La operacion ES un exito real en Flota; lo que no se hace es
 *    prometer un aviso que nadie manda.
 *  - **Asignar no pone al conductor `en_servicio`**: eso es una transicion explicita, con su modal.
 */
export function ModalAsignarVehiculo({
  conductor,
  abierto,
  onCerrar,
}: {
  conductor: ConductorListItemDto | null
  abierto: boolean
  onCerrar: () => void
}) {
  // Montado solo mientras esta abierto: el formulario arranca limpio y el error del intento anterior
  // no reaparece.
  if (!abierto || conductor === null) return null

  return <Formulario conductor={conductor} onCerrar={onCerrar} />
}

function Formulario({
  conductor,
  onCerrar,
}: {
  conductor: ConductorListItemDto
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  const form = useForm<AsignarVehiculoConductorFormulario>({
    resolver: zodResolver(asignarVehiculoConductorSchema),
    defaultValues: valoresInicialesAsignarVehiculo(),
  })

  // `useWatch`, no `form.watch()`: `watch()` devuelve una funcion que el compilador de React no
  // puede memorizar sin arriesgar UI vieja, y el lint del repo la rechaza.
  const vehiculoFlotaId = useWatch({ control: form.control, name: 'vehiculoFlotaId' })

  // El hook se bindea al vehiculo elegido. Mientras no hay eleccion queda con `''`: no se dispara
  // ninguna mutation hasta que el submit pasa la validacion de Zod, que exige el id.
  const mutacion = useAsignarConductor(vehiculoFlotaId)

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aAsignarConductorRequest(conductor.id, valores), {
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
    })
  })

  const errorVehiculo = form.formState.errors.vehiculoFlotaId?.message

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      tamano="lg"
      titulo={t('flota:asignacionVehiculo.titulo')}
      descripcion={t('flota:asignacionVehiculo.descripcion')}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {t('flota:asignacionVehiculo.asignar')}
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
        {mutacion.error ? <AvisoErrorAsignacionConductor error={mutacion.error} /> : null}

        <Controller
          control={form.control}
          name="vehiculoFlotaId"
          render={({ field }) => (
            <Campo
              etiqueta={t('flota:asignacionVehiculo.vehiculo')}
              error={errorVehiculo === undefined ? undefined : t(errorVehiculo, { defaultValue: errorVehiculo })}
              requerido
            >
              {(control) => (
                <SelectorVehiculo
                  control={control}
                  valor={field.value}
                  onCambio={field.onChange}
                  deshabilitado={mutacion.isPending}
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

        <Controller
          control={form.control}
          name="rol"
          render={({ field }) => (
            <Campo
              etiqueta={t('flota:asignacionConductor.rol')}
              ayuda={t('flota:asignacionConductor.rolAyuda')}
              requerido
            >
              {(control) => (
                <GrupoRadio
                  {...control}
                  orientacion="horizontal"
                  valor={field.value}
                  onCambio={field.onChange}
                  opciones={[
                    { valor: 'principal', etiqueta: t('flota:asignacionConductor.rolPrincipal') },
                    { valor: 'secundario', etiqueta: t('flota:asignacionConductor.rolSecundario') },
                  ]}
                />
              )}
            </Campo>
          )}
        />

        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
          {/*
            ES UN SOLO POST: no libera lo que el conductor ya tiene. El backend lo acepta (no chequea
            asignaciones abiertas del conductor; el índice único parcial es por vehículo), así que sin
            este aviso el usuario cree que reemplazó y el conductor queda con 2 vigentes.
          */}
          {conductor.vehiculosAsignadosCount > 0 ? (
            <p>{t('flota:asignacionVehiculo.noLiberaElActual')}</p>
          ) : null}
          <p>{t('flota:asignacionConductor.noAvisaAlConductor')}</p>
        </div>
      </form>
    </Modal>
  )
}
