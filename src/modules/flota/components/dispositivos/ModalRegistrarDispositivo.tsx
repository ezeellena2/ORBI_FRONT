import { Controller, useForm, type FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AreaTexto } from '@/shared/ui/AreaTexto'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import {
  hasApiFieldErrors,
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import { AvisoOperacion } from '../AvisoOperacion'
import { CampoModeloDispositivo, CampoProveedorSim } from './CamposCatalogoDispositivo'
import { useRegistrarDispositivo } from '../../hooks/useRegistrarDispositivo'
import {
  aRegistrarDispositivoRequest,
  registrarDispositivoSchema,
  VALORES_INICIALES_REGISTRAR_DISPOSITIVO,
  type RegistrarDispositivoFormulario,
} from '../../schemas/registrar-dispositivo'

/** Marca los errores que puso el SERVIDOR (ya resueltos desde su `message_key`, no se retraducen). */
const TIPO_ERROR_SERVIDOR = 'servidor'

/**
 * Modal "Registrar dispositivo GPS" — `POST /api/flota/dispositivos`, permiso
 * `flota.dispositivos.crear`.
 *
 * ── SOLO MODO A, Y SE DICE ────────────────────────────────────────────────────────────────────
 * El IMEI que se tipea tiene que estar YA dado de alta en la plataforma. El Modo B (crear el equipo
 * desde acá) esta bloqueado: el registro canonico exige un `traccar_device_id` que nada en el
 * sistema genera (**B-7**) y el backend responde 400 `flota.dispositivo.alta_modo_b_no_soportado`.
 * Por eso NO hay bloque "equipo nuevo": un formulario que no puede guardar es peor que su ausencia.
 * La restriccion viaja en la ayuda del campo, antes del error, no despues.
 *
 * ── LOS 2 SELECTS SALEN DEL CATALOGO, NUNCA HARDCODEADOS ──────────────────────────────────────
 * `modeloId` y `proveedorSimId` viajan como uuid de `modelos_dispositivo_flota` /
 * `proveedores_sim_flota` (B-18). Los dos son OPCIONALES —`modeloId` lo es desde **D-S3-5**,
 * justamente porque con el catalogo vacio y el campo obligatorio TODA alta daba 404
 * `flota.dispositivo.modelo_no_existe`— y traen su propia alta en linea para la organizacion que no
 * encuentra el suyo.
 *
 * ── EL ERROR NO CIERRA EL MODAL ───────────────────────────────────────────────────────────────
 * Un 409 `flota.dispositivo.imei_duplicado` deja el modal abierto con lo tipeado intacto. Cerrarlo
 * en verde sobre un rechazo es la version silenciosa de mentir: la fila no aparece en el listado y
 * nadie sabe por que.
 */
export function ModalRegistrarDispositivo({
  abierto,
  onCerrar,
}: {
  abierto: boolean
  onCerrar: () => void
}) {
  // Se monta solo mientras esta abierto: asi el formulario arranca limpio en cada apertura y el
  // error del intento anterior no reaparece en el siguiente.
  if (!abierto) return null

  return <Formulario onCerrar={onCerrar} />
}

function Formulario({ onCerrar }: { onCerrar: () => void }) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useRegistrarDispositivo()

  const form = useForm<RegistrarDispositivoFormulario>({
    resolver: zodResolver(registrarDispositivoSchema),
    defaultValues: VALORES_INICIALES_REGISTRAR_DISPOSITIVO,
  })

  // Los de Zod son claves i18n y se traducen; los del servidor ya vienen resueltos y se pintan tal
  // cual. Se distinguen por el `type`, no adivinando si el string parece una clave.
  const mensajeDe = (error: FieldError | undefined) => {
    if (!error?.message) return undefined
    return error.type === TIPO_ERROR_SERVIDOR
      ? error.message
      : t(error.message, { defaultValue: error.message })
  }

  // El 409 (`imei_duplicado`) y los 404 de catalogo llegan como `code` top-level, no dentro de
  // `validation_errors`: van al banner. Su copy vive UNA sola vez en el catalogo de errores de
  // `common.json` y se resuelve por `message_key` / `errors.<code>`.
  const errorGeneral = (() => {
    if (!mutacion.error) return null
    const apiError = parseApiError(mutacion.error)
    if (hasApiFieldErrors(apiError)) return null
    return resolveApiErrorMessage(apiError, t)
  })()

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aRegistrarDispositivoRequest(valores), {
      // Cierra y DEJA AL USUARIO EN EL LISTADO: la fila nueva aparece con su badge "Disponible"
      // (el hook invalida el prefijo). No se navega a la ficha — el criterio de `f-05` es
      // justamente ver la fila aparecer, y sacar al usuario de la pantalla le esconde el resultado
      // de lo que acaba de hacer.
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
      onError: (error) => {
        // Un 400 de forma vuelve a los campos; el resto queda en el banner de arriba.
        const errores = resolveApiFieldErrors(parseApiError(error), t)
        for (const [campo, mensaje] of Object.entries(errores)) {
          form.setError(campo as keyof RegistrarDispositivoFormulario, {
            type: TIPO_ERROR_SERVIDOR,
            message: mensaje,
          })
        }
      },
    })
  })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      tamano="lg"
      titulo={t('flota:dispositivoAlta.titulo')}
      descripcion={t('flota:dispositivoAlta.subtitulo')}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {t('flota:dispositivoAlta.guardar')}
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

        <Campo
          etiqueta={t('flota:dispositivoAlta.imei')}
          ayuda={t('flota:dispositivoAlta.imeiAyuda')}
          error={mensajeDe(form.formState.errors.imei)}
          requerido
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('imei')}
              mono
              inputMode="numeric"
              autoComplete="off"
              invalido={form.formState.errors.imei !== undefined}
            />
          )}
        </Campo>

        <Campo
          etiqueta={t('flota:dispositivoAlta.alias')}
          ayuda={t('flota:dispositivoAlta.aliasAyuda')}
          error={mensajeDe(form.formState.errors.alias)}
          requerido
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('alias')}
              invalido={form.formState.errors.alias !== undefined}
            />
          )}
        </Campo>

        {/*
          Los selects van por `Controller` y no por `register`: son controles CONTROLADOS de Base UI
          y no emiten el evento nativo que `register` escucharia.
        */}
        <Controller
          control={form.control}
          name="modeloId"
          render={({ field }) => (
            <CampoModeloDispositivo valor={field.value} onCambio={field.onChange} />
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta={t('flota:dispositivoAlta.numeroSerie')}
            ayuda={t('flota:dispositivoAlta.numeroSerieAyuda')}
            error={mensajeDe(form.formState.errors.numeroSerie)}
          >
            {(control) => <Input {...control} {...form.register('numeroSerie')} mono />}
          </Campo>

          <Campo
            etiqueta={t('flota:dispositivoAlta.numeroSim')}
            error={mensajeDe(form.formState.errors.numeroSim)}
          >
            {(control) => <Input {...control} {...form.register('numeroSim')} mono />}
          </Campo>
        </div>

        <Controller
          control={form.control}
          name="proveedorSimId"
          render={({ field }) => (
            <CampoProveedorSim valor={field.value} onCambio={field.onChange} />
          )}
        />

        <Campo
          etiqueta={t('flota:dispositivoAlta.notas')}
          error={mensajeDe(form.formState.errors.notasOperativas)}
        >
          {(control) => <AreaTexto {...control} {...form.register('notasOperativas')} filas={3} />}
        </Campo>
      </form>
    </Modal>
  )
}
