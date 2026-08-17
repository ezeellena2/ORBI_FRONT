import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/ui/Badge'
import { Boton } from '@/shared/ui/Boton'
import { Modal } from '@/shared/ui/Modal'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { AvisoOperacion } from '../../AvisoOperacion'
import { useProbarWebhook } from '../../../hooks/useProbarWebhook'
import {
  claveDeEstadoEntrega,
  claveDeGuiaDeErrorCentro,
  tratamientoDeErrorCentro,
  varianteDeEstadoEntrega,
} from '../../../vocabulario-centro-problemas'
import type { WebhookEntregaDto } from '@/services/contracts/flota'

/**
 * Modal "Probar webhook" — `POST .../webhooks/{id}/probar`, permiso
 * `flota.integraciones.gestionar`.
 *
 * ── POR QUE ES UN MODAL Y NO UN BOTON DEL KEBAB ───────────────────────────────────────────────
 * La prueba **produce un dato que hay que leer** (estado de la entrega, status HTTP, intentos), y ese
 * dato no cabe en un toast. Ademas se dispara desde **3 lugares** —el kebab del endpoint, el boton
 * global del header y el kebab de una REGLA con webhook— y el hook es por `webhookId`: un modal es
 * el unico lugar donde ese id esta fijo mientras la mutacion vive.
 *
 * ── LOS 2 INVARIANTES QUE EL COPY TIENE QUE DECIR ─────────────────────────────────────────────
 *  1. **Efecto secundario cero**: no genera problema operativo, no entra al motor de reglas, no abre
 *     alerta y no publica nada al bus interno. Lo unico que produce es **una fila de entrega** ⇒
 *     **probar no marca al endpoint como sano** (`api.md` §Endpoint de prueba).
 *  2. **Es la UNICA entrega que hoy existe en todo el sistema**: como el alta no acepta `eventos[]`,
 *     ningun endpoint tiene suscripciones y no llega nada automatico (PENDIENTE #3). El copy no debe
 *     sugerir que "ademas van a empezar a llegar los eventos".
 *
 * ⚠️ **Devuelve 200 aunque el receptor haya fallado.** El resultado es un DATO, no un error de la
 * API: se lee en `entrega.estado` + `entrega.httpStatus`. Ramificar por el status HTTP de esta
 * llamada perderia exactamente el caso interesante. Por eso `mutacion.error` solo cubre el fallo de
 * la API (404, 403, red), y el resultado de la entrega se pinta aparte.
 */
export function ModalProbarWebhook({
  webhookId,
  nombre,
  abierto,
  onCerrar,
}: {
  webhookId: string | null
  /** Nombre del endpoint. En el kebab de una regla es el de la regla: el usuario reconoce eso. */
  nombre: string
  abierto: boolean
  onCerrar: () => void
}) {
  if (!abierto || webhookId === null) return null

  return <Contenido webhookId={webhookId} nombre={nombre} onCerrar={onCerrar} />
}

function Contenido({
  webhookId,
  nombre,
  onCerrar,
}: {
  webhookId: string
  nombre: string
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useProbarWebhook(webhookId)

  const apiError = mutacion.error ? parseApiError(mutacion.error) : null
  const entrega = mutacion.data?.entrega ?? null

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={t('flota:centro.integraciones.probar.titulo')}
      descripcion={nombre}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cerrar')}
          </Boton>
          <Boton onClick={() => mutacion.mutate()} cargando={mutacion.isPending}>
            {t('flota:centro.integraciones.probar.accion')}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-fg-secundario">
          {t('flota:centro.integraciones.probar.aclaracion')}
        </p>
        <p className="text-sm text-fg-secundario">
          {t('flota:centroBloqueado.suscripciones')}
        </p>

        {apiError === null ? null : (
          <AvisoOperacion
            titulo={resolveApiErrorMessage(apiError, t)}
            mensaje={t(
              `flota:${claveDeGuiaDeErrorCentro(tratamientoDeErrorCentro(apiError.code, apiError.args))}`,
            )}
            trazaId={apiError.traceId}
          />
        )}

        {entrega === null ? null : <ResultadoDeLaPrueba entrega={entrega} />}
      </div>
    </Modal>
  )
}

/**
 * ⚠️ **Una prueba que falla NO es un error de la pantalla**: es el resultado. Por eso se pinta como
 * dato (badge del estado + status) y no como `AvisoOperacion` rojo — el que fallo es el sistema del
 * cliente, y lo accionable es su status HTTP.
 *
 * `errorResumen` **no se muestra**: desde el cierre de slice-06 persiste la constante `http_error` y
 * ya no el texto que elegia el receptor. Pintarlo agregaria una linea sin informacion; el
 * diagnostico util es `httpStatus`.
 */
function ResultadoDeLaPrueba({ entrega }: { entrega: WebhookEntregaDto }) {
  const { t } = useTranslation('flota')

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-borde bg-superficie-2 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variante={varianteDeEstadoEntrega(entrega.estado)} punto>
          {t(claveDeEstadoEntrega(entrega.estado))}
        </Badge>
        <span className="font-mono text-xs tabular-nums text-fg-secundario">
          {entrega.httpStatus === null
            ? t('centro.integraciones.entregas.sinStatus')
            : String(entrega.httpStatus)}
        </span>
        <span className="font-mono text-xs text-fg-terciario">{entrega.eventType}</span>
      </div>
      <p className="text-xs text-fg-terciario">
        {t('centro.integraciones.probar.resultadoAclaracion')}
      </p>
    </div>
  )
}
