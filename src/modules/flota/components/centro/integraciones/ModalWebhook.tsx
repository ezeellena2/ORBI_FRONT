import { Controller, useForm, type FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Icono } from '@/shared/ui/Icono'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Toggle } from '@/shared/ui/Toggle'
import {
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import { AvisoOperacion } from '../../AvisoOperacion'
import { useActualizarWebhook } from '../../../hooks/useActualizarWebhook'
import { useCrearWebhook } from '../../../hooks/useCrearWebhook'
import {
  claveDeGuiaDeErrorCentro,
  tratamientoDeErrorCentro,
} from '../../../vocabulario-centro-problemas'
import {
  aActualizarWebhookRequest,
  aCrearWebhookRequest,
  aFormularioDeWebhook,
  VALORES_INICIALES_WEBHOOK,
  webhookEndpointSchema,
  type WebhookEndpointFormulario,
} from '../../../schemas/webhook-endpoint'
import type { SecretoWebhookDto, WebhookEndpointDto } from '@/services/contracts/flota'

const TIPO_ERROR_SERVIDOR = 'servidor'

/**
 * Modal "Webhook" (alta / edicion) — `POST` y `PATCH /api/flota/integraciones/webhooks`.
 *
 * ══ ⚠️ EL SUBMIT **NO** ESTA BLOQUEADO — DESVIACION DECLARADA DE `f-11` PASO 8 ══════════════════
 * El paso manda dejar el submit deshabilitado con hint "pendiente DA-IN-08", porque el request
 * "exige `eventos[]` y `scopes[]`". Eso era cierto contra `dtos.ts` y **dejo de serlo cuando el
 * backend cerro**: el request real es `{ nombre, url, activo? }` y el alta **funciona**
 * (`ESTADO.md`: *"el alta de endpoint SI se construyo: nace sin suscripciones, fail-closed"*). El
 * orden de autoridad pone `00-contrato/` sobre `03-build/`, asi que el modal guarda.
 *
 * Lo que hay que decir es la **consecuencia**, y va en el cuerpo del modal antes de guardar: el
 * endpoint nace **sin suscripciones** y **no va a recibir ninguna entrega automatica**. La unica
 * entrega que existe es la explicita de "Probar".
 *
 * ══ LOS 2 CONTROLES QUE NO EXISTEN ══════════════════════════════════════════════════════════════
 * **Eventos** y **Scopes**: el request no los acepta. Ni deshabilitados ni como texto libre (el
 * mockup usa inputs libres, que son demo).
 *
 * ══ EL ALTA DEVUELVE EL SECRETO, NO EL RECURSO ══════════════════════════════════════════════════
 * `POST` responde **200 `SecretoWebhookDto`**: el cuerpo **no es el endpoint creado**, es el secreto
 * de una sola lectura. Por eso el `onCreado` sube el DTO a la pagina, que abre `ModalSecretoWebhook`
 * — el valor no se persiste en ningun lado y muere con ese modal.
 *
 * ══ EL 400 DE LA URL ES DE CAMPO ════════════════════════════════════════════════════════════════
 * `flota.webhook.url_no_permitida` (anti-SSRF) va **al input de la URL** con `args {url}`, no al
 * banner: es accionable — el usuario puede corregirla. Y el mensaje es **el mismo** que muestra la
 * validacion de cliente del esquema `https`.
 */
export function ModalWebhook({
  abierto,
  endpoint,
  onCerrar,
  onCreado,
}: {
  abierto: boolean
  /** `null` = alta. */
  endpoint: WebhookEndpointDto | null
  onCerrar: () => void
  onCreado: (secreto: SecretoWebhookDto) => void
}) {
  if (!abierto) return null

  return <Formulario endpoint={endpoint} onCerrar={onCerrar} onCreado={onCreado} />
}

function Formulario({
  endpoint,
  onCerrar,
  onCreado,
}: {
  endpoint: WebhookEndpointDto | null
  onCerrar: () => void
  onCreado: (secreto: SecretoWebhookDto) => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  const esEdicion = endpoint !== null
  const crear = useCrearWebhook()
  const actualizar = useActualizarWebhook(endpoint?.id ?? '')
  const mutacion = esEdicion ? actualizar : crear

  const form = useForm<WebhookEndpointFormulario>({
    resolver: zodResolver(webhookEndpointSchema),
    defaultValues: endpoint === null ? VALORES_INICIALES_WEBHOOK : aFormularioDeWebhook(endpoint),
  })

  const mensajeDe = (error: FieldError | undefined) => {
    if (!error?.message) return undefined
    return error.type === TIPO_ERROR_SERVIDOR
      ? error.message
      : t(error.message, { defaultValue: error.message })
  }

  const apiError = mutacion.error ? parseApiError(mutacion.error) : null
  const tratamiento = apiError === null ? null : tratamientoDeErrorCentro(apiError.code, apiError.args)

  const enviar = form.handleSubmit((valores) => {
    const alFallar = (error: unknown) => {
      const parseado = parseApiError(error)

      /*
        El anti-SSRF llega como `code` top-level y no dentro de `validation_errors`, asi que
        `resolveApiFieldErrors` no lo reparte solo. Es de CAMPO: sin esto, el usuario ve un banner
        arriba y ninguna marca en la URL, que es el unico control que puede corregir.
      */
      if (parseado.code === 'flota.webhook.url_no_permitida') {
        form.setError('url', {
          type: TIPO_ERROR_SERVIDOR,
          message: resolveApiErrorMessage(parseado, t),
        })
        return
      }

      for (const [campo, mensaje] of Object.entries(resolveApiFieldErrors(parseado, t))) {
        form.setError(campo as keyof WebhookEndpointFormulario, {
          type: TIPO_ERROR_SERVIDOR,
          message: mensaje,
        })
      }
    }

    if (esEdicion) {
      actualizar.mutate(aActualizarWebhookRequest(valores), {
        onSuccess: () => {
          actualizar.reset()
          onCerrar()
        },
        onError: alFallar,
      })
      return
    }

    crear.mutate(aCrearWebhookRequest(valores), {
      onSuccess: (secreto) => {
        crear.reset()
        onCerrar()
        // El secreto se muestra en su propio modal: es la unica vez que sale de Flota.
        onCreado(secreto)
      },
      onError: alFallar,
    })
  })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      titulo={t(
        esEdicion ? 'flota:centro.integraciones.modal.tituloEditar' : 'flota:centro.integraciones.modal.tituloAlta',
      )}
      descripcion={t('flota:centro.integraciones.modal.subtitulo')}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {t('flota:centro.integraciones.modal.guardar')}
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
        {apiError === null || tratamiento === 'urlNoPermitida' ? null : (
          <AvisoOperacion
            titulo={resolveApiErrorMessage(apiError, t)}
            mensaje={t(`flota:${claveDeGuiaDeErrorCentro(tratamiento ?? 'generico')}`)}
            trazaId={apiError.traceId}
          />
        )}

        <Campo
          etiqueta={t('flota:centro.integraciones.modal.nombre')}
          error={mensajeDe(form.formState.errors.nombre)}
          requerido
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('nombre')}
              invalido={form.formState.errors.nombre !== undefined}
            />
          )}
        </Campo>

        <Campo
          etiqueta={t('flota:centro.integraciones.modal.url')}
          ayuda={t('flota:centro.integraciones.modal.urlAyuda')}
          error={mensajeDe(form.formState.errors.url)}
          requerido
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('url')}
              mono
              inputMode="url"
              autoComplete="off"
              invalido={form.formState.errors.url !== undefined}
            />
          )}
        </Campo>

        <Controller
          control={form.control}
          name="activo"
          render={({ field }) => (
            <Toggle
              etiqueta={t('flota:centro.integraciones.modal.activo')}
              descripcion={t('flota:centro.integraciones.modal.activoAyuda')}
              activo={field.value}
              onCambio={field.onChange}
            />
          )}
        />

        {/*
          PENDIENTE #3 (mitad de DA-IN-08). No es un "próximamente": es la razón por la que este
          modal no tiene selector de eventos, y el integrador tiene que saberlo ANTES de guardar.
        */}
        <p className="flex items-start gap-2 rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
          <Icono icono={Info} tamano="sm" />
          <span>{t('flota:centroBloqueado.suscripciones')}</span>
        </p>
      </form>
    </Modal>
  )
}
