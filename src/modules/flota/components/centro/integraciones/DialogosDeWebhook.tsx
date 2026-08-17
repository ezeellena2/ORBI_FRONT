import { useTranslation } from 'react-i18next'
import { DialogoConfirmacion } from '@/shared/ui/DialogoConfirmacion'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { useEliminarWebhook } from '../../../hooks/useEliminarWebhook'
import { useRotarSecretoWebhook } from '../../../hooks/useRotarSecretoWebhook'
import type { SecretoWebhookDto, WebhookEndpointDto } from '@/services/contracts/flota'

/**
 * Los 2 dialogos de confirmacion de la pantalla.
 *
 * ── POR QUE SON COMPONENTES Y NO 2 `DialogoConfirmacion` EN LA PAGINA ─────────────────────────
 * `useEliminarWebhook(id)` y `useRotarSecretoWebhook(id)` fijan el endpoint **en la construccion del
 * hook**, y en una lista el id lo trae la card que el usuario toco. Montar el dialogo solo cuando hay
 * un endpoint elegido resuelve las dos cosas a la vez: el hook tiene su id fijo y el estado de la
 * mutacion muere con el dialogo (el error del intento anterior no reaparece en el siguiente).
 */

/**
 * Eliminar un endpoint — `DELETE .../webhooks/{id}` -> 204.
 *
 * ⚠️ **Es baja LOGICA**, no hard-delete: la fila sigue existiendo y deja de recibir entregas, como
 * toda baja del modulo. Y **el log de entregas ya emitidas NO se toca** — es la auditoria de a donde
 * salio cada payload. Por eso el copy **no dice** "se borra el historial de envios": no se borra.
 *
 * No pide tipear el nombre (a diferencia del hard-delete de dispositivo): no es irreversible del
 * lado de los datos y no hay valor exacto que confirmar.
 */
export function DialogoEliminarWebhook({
  endpoint,
  onCerrar,
}: {
  endpoint: WebhookEndpointDto | null
  onCerrar: () => void
}) {
  if (endpoint === null) return null

  return <Eliminar endpoint={endpoint} onCerrar={onCerrar} />
}

function Eliminar({
  endpoint,
  onCerrar,
}: {
  endpoint: WebhookEndpointDto
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useEliminarWebhook(endpoint.id)

  const error = mutacion.error
    ? resolveApiErrorMessage(parseApiError(mutacion.error), t)
    : null

  return (
    <DialogoConfirmacion
      abierto
      onCerrar={onCerrar}
      onConfirmar={() => mutacion.mutate(undefined, { onSuccess: onCerrar })}
      variante="peligro"
      titulo={t('flota:centro.integraciones.eliminar.titulo', { nombre: endpoint.nombre })}
      descripcion={error ?? t('flota:centro.integraciones.eliminar.descripcion')}
      textoConfirmar={t('flota:centro.integraciones.eliminar.confirmar')}
      textoCancelar={t('flota:comun.cancelar')}
      cargando={mutacion.isPending}
    />
  )
}

/**
 * Rotar el secreto — `POST .../webhooks/{id}/rotar-secreto` -> 200 `SecretoWebhookDto`.
 *
 * ══ ⚠️ EL COPY DE ESTA CONFIRMACION — B-39 ══════════════════════════════════════════════════════
 * `api.md` §Rotacion promete una **ventana de gracia** en la que el secreto anterior sigue validando.
 * **Hoy eso es falso**: Flota firma con el nuevo desde t=0 y manda **una sola** firma, asi que el
 * receptor que todavia tiene el viejo pierde el **100 %** de las entregas desde el instante de la
 * rotacion. `ESTADO.md` lo lista como lo que el frontend **no debe dibujar**.
 *
 * ⇒ La confirmacion dice que hay que **coordinar el despliegue del receptor**, y por eso es una
 * confirmacion y no un boton directo: rotar tiene consecuencia inmediata en el sistema de un tercero.
 */
export function DialogoRotarSecreto({
  endpoint,
  onCerrar,
  onRotado,
}: {
  endpoint: WebhookEndpointDto | null
  onCerrar: () => void
  onRotado: (secreto: SecretoWebhookDto) => void
}) {
  if (endpoint === null) return null

  return <Rotar endpoint={endpoint} onCerrar={onCerrar} onRotado={onRotado} />
}

function Rotar({
  endpoint,
  onCerrar,
  onRotado,
}: {
  endpoint: WebhookEndpointDto
  onCerrar: () => void
  onRotado: (secreto: SecretoWebhookDto) => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useRotarSecretoWebhook(endpoint.id)

  const error = mutacion.error
    ? resolveApiErrorMessage(parseApiError(mutacion.error), t)
    : null

  return (
    <DialogoConfirmacion
      abierto
      onCerrar={onCerrar}
      onConfirmar={() =>
        mutacion.mutate(undefined, {
          onSuccess: (secreto) => {
            onCerrar()
            // El valor no se persiste en ningun lado: va directo al modal que lo muestra una vez.
            onRotado(secreto)
          },
        })
      }
      variante="peligro"
      titulo={t('flota:centro.integraciones.rotar.titulo', { nombre: endpoint.nombre })}
      descripcion={error ?? t('flota:centroBloqueado.ventanaDeGracia')}
      textoConfirmar={t('flota:centro.integraciones.rotar.confirmar')}
      textoCancelar={t('flota:comun.cancelar')}
      cargando={mutacion.isPending}
    />
  )
}
