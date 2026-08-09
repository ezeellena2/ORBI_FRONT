import { useForm, type FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { AreaTexto } from '@/shared/ui/AreaTexto'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Icono } from '@/shared/ui/Icono'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import {
  hasApiFieldErrors,
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import type { VehiculoDetalleDto } from '@/services/contracts/flota'
import { AvisoOperacion } from '../AvisoOperacion'
import { useEditarVehiculo } from '../../hooks/useEditarVehiculo'
import { claveDeTipoVehiculo } from './vocabulario'
import {
  aActualizarVehiculoRequest,
  editarVehiculoSchema,
  valoresInicialesEditarVehiculo,
  type EditarVehiculoFormulario,
} from '../../schemas/editar-vehiculo'

/**
 * Marca los errores que puso el SERVIDOR, para no volver a traducirlos: ya vienen resueltos desde su
 * `message_key`. Los de Zod, en cambio, son claves y sí se traducen.
 */
const TIPO_ERROR_SERVIDOR = 'servidor'

/**
 * Modal "Editar vehículo" — SOLO datos operativos (DA-VD-11).
 *
 * La identidad canónica (patente/marca/modelo/año/tipo) se muestra BLOQUEADA con su leyenda: Flota
 * no la posee, se edita en la ficha canónica del vehículo. Se muestra en vez de esconderse porque
 * el usuario tiene que entender que esos datos existen y dónde se cambian; el modal del mockup que
 * los mostraba editables está superseded por el contrato.
 *
 * El toggle "Vehículo activo" del mockup tampoco está: la baja va por su propio flujo (`DELETE`),
 * no por este `PATCH` (DA-VD-12).
 *
 * `cierrePorFuera={false}`: hay un formulario con cambios, y perder lo tipeado por un click al
 * costado es la queja más cara de reparar.
 */
export function ModalEditarVehiculo({
  vehiculo,
  abierto,
  onCerrar,
}: {
  vehiculo: VehiculoDetalleDto
  abierto: boolean
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useEditarVehiculo(vehiculo.id)

  const form = useForm<EditarVehiculoFormulario>({
    resolver: zodResolver(editarVehiculoSchema),
    defaultValues: valoresInicialesEditarVehiculo(vehiculo),
  })

  // Los de Zod son claves i18n y se traducen; los del servidor ya vienen resueltos y se pintan tal
  // cual. Se distinguen por el `type`, no adivinando si el string parece una clave.
  const mensajeDe = (error: FieldError | undefined) => {
    if (!error?.message) return undefined
    return error.type === TIPO_ERROR_SERVIDOR
      ? error.message
      : t(error.message, { defaultValue: error.message })
  }

  const errorGeneral = (() => {
    if (!mutacion.error) return null
    const apiError = parseApiError(mutacion.error)
    if (hasApiFieldErrors(apiError)) return null
    return resolveApiErrorMessage(apiError, t)
  })()

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aActualizarVehiculoRequest(valores), {
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
      onError: (error) => {
        // Un 400 del backend vuelve a los campos; el resto queda en el banner de arriba.
        const errores = resolveApiFieldErrors(parseApiError(error), t)
        for (const [campo, mensaje] of Object.entries(errores)) {
          form.setError(campo as keyof EditarVehiculoFormulario, {
            type: TIPO_ERROR_SERVIDOR,
            message: mensaje,
          })
        }
      },
    })
  })

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      cierrePorFuera={false}
      titulo={t('flota:detalle.editar.titulo')}
      descripcion={vehiculo.patente ?? undefined}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {t('flota:detalle.editar.guardar')}
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
        {errorGeneral ? <AvisoOperacion titulo={errorGeneral} /> : null}

        <IdentidadBloqueada vehiculo={vehiculo} />

        <Campo
          etiqueta={t('flota:detalle.editar.alias')}
          ayuda={t('flota:detalle.editar.aliasAyuda')}
          error={mensajeDe(form.formState.errors.alias)}
        >
          {(control) => <Input {...control} {...form.register('alias')} />}
        </Campo>

        <Campo
          etiqueta={t('flota:detalle.editar.kilometraje')}
          error={mensajeDe(form.formState.errors.kilometrajeActual)}
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('kilometrajeActual')}
              mono
              inputMode="numeric"
              invalido={form.formState.errors.kilometrajeActual !== undefined}
            />
          )}
        </Campo>

        <Campo
          etiqueta={t('flota:detalle.editar.notas')}
          error={mensajeDe(form.formState.errors.notasOperativas)}
        >
          {(control) => <AreaTexto {...control} {...form.register('notasOperativas')} filas={3} />}
        </Campo>
      </form>
    </Modal>
  )
}

/** La frontera canónico↔operativo, dicha en la UI en vez de dejarla como sorpresa del backend. */
function IdentidadBloqueada({ vehiculo }: { vehiculo: VehiculoDetalleDto }) {
  const { t } = useTranslation(['flota', 'common'])

  const campos = [
    { clave: 'patente', etiqueta: t('flota:detalle.info.patente'), valor: vehiculo.patente },
    { clave: 'marca', etiqueta: t('flota:detalle.info.marca'), valor: vehiculo.marca },
    { clave: 'modelo', etiqueta: t('flota:detalle.info.modelo'), valor: vehiculo.modelo },
    {
      clave: 'anio',
      etiqueta: t('flota:detalle.info.anio'),
      valor: vehiculo.anio === null ? null : String(vehiculo.anio),
    },
    {
      clave: 'tipo',
      etiqueta: t('flota:detalle.info.tipo'),
      valor:
        vehiculo.tipo === null
          ? null
          : t(`flota:${claveDeTipoVehiculo(vehiculo.tipo)}`, { defaultValue: vehiculo.tipo }),
    },
  ]

  return (
    <fieldset disabled className="flex flex-col gap-3">
      <legend className="sr-only">{t('flota:detalle.editar.leyendaCanonicos')}</legend>

      <p className="flex items-start gap-2 rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
        <Icono icono={Lock} tamano="sm" />
        {t('flota:detalle.editar.leyendaCanonicos')}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {campos.map((campo) => (
          <Campo key={campo.clave} etiqueta={campo.etiqueta}>
            {(control) => (
              <Input
                {...control}
                readOnly
                value={campo.valor ?? ''}
                mono={campo.clave === 'patente' || campo.clave === 'anio'}
              />
            )}
          </Campo>
        ))}
      </div>
    </fieldset>
  )
}
