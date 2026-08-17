import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Plug } from 'lucide-react'
import type { ProblemaOperativoDetalleDto, WebhookEntregaDto } from '@/services/contracts/flota'
import { Badge } from '@/shared/ui/Badge'
import { Boton } from '@/shared/ui/Boton'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { AccionConMotivo } from '../../AccionConMotivo'
import { formatearFechaHora } from '../../detalle/formato'
import { usePermisos } from '../../../hooks/usePermisos'
import {
  claveDeEstadoEntrega,
  varianteDeEstadoEntrega,
} from '../../../vocabulario-centro-problemas'
import { CORRELACION_PROBLEMA_WEBHOOK_DISPONIBLE } from '../../../vocabulario-ticket-problema'

const RUTA_INTEGRACIONES = '/app/flota/integraciones'
const PERMISO_INTEGRACIONES = 'flota.integraciones.leer'

/**
 * Tab **Integraciones** del ticket (ficha §6): las entregas salientes de ESTE problema.
 *
 * ══ LA LISTA LLEGA VACÍA SIEMPRE, Y ESO NO ES "NO SE ENVIÓ NADA" ═══════════════════════════════
 * `webhooks: []` e `integracion: { enviado: false, ultimoEstado: null }` viajan así en el **100 %**
 * de las respuestas, incluso en una organización con webhooks configurados y entregas exitosas: la
 * entrega guarda `webhook_endpoint_id` + `event_id` y el `EventId` del evento de negocio **no se
 * persiste en el problema**, así que **ninguna columna ata una entrega a un problema** (DRIFT 7).
 *
 * ⇒ El vacío **no puede decir "este problema no disparó ningún envío"**: eso sería una afirmación
 * sobre los envíos, y es la afirmación que el esquema no permite hacer. Dice que la trazabilidad
 * por problema todavía no existe y remite a Integraciones, donde las entregas **sí** se ven (a nivel
 * endpoint). Es el mismo criterio con el que el listado de vehículos no afirma "no tiene GPS".
 *
 * ── "REINTENTAR" NO SE DIBUJA ─────────────────────────────────────────────────────────────────
 * `POST .../reintentar` responde 200 y reencola de verdad, pero **nadie drena la cola** (B-40) y el
 * cuerpo de la entrega no es reconstruible: la fila quedaría en `reintentando` para siempre. El 200
 * no miente sobre lo que hace; sí sobre lo que va a pasar. La tabla de entregas se dibuja igual
 * —para el día que el vínculo exista— y sin la acción.
 */
export function TabIntegracionesTicket({
  detalle,
}: {
  detalle: ProblemaOperativoDetalleDto
}) {
  const { t, i18n } = useTranslation('flota')
  const { tienePermiso } = usePermisos()

  const habilitado = tienePermiso(PERMISO_INTEGRACIONES)

  if (detalle.webhooks.length === 0) {
    return (
      <EstadoVacio
        variante="sin-datos"
        icono={Plug}
        titulo={t('centro.ticket.integraciones.titulo')}
        descripcion={
          CORRELACION_PROBLEMA_WEBHOOK_DISPONIBLE
            ? t('centro.ticket.integraciones.sinEntregas')
            : t('centro.ticket.integraciones.sinCorrelacion')
        }
        acciones={
          <AccionConMotivo
            motivo={
              habilitado
                ? undefined
                : t('centro.submenu.sinPermiso', { permiso: PERMISO_INTEGRACIONES })
            }
          >
            <Boton
              variante="secundaria"
              tamano="sm"
              deshabilitado={!habilitado}
              render={habilitado ? <Link to={RUTA_INTEGRACIONES} /> : undefined}
            >
              {t('centro.ticket.integraciones.configurar')}
            </Boton>
          </AccionConMotivo>
        }
      />
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {detalle.webhooks.map((entrega) => (
        <FilaDeEntrega key={entrega.id} entrega={entrega} idioma={i18n.language} />
      ))}
    </ul>
  )
}

function FilaDeEntrega({ entrega, idioma }: { entrega: WebhookEntregaDto; idioma: string }) {
  const { t } = useTranslation('flota')

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-borde px-3 py-2 text-xs">
      <Badge variante={varianteDeEstadoEntrega(entrega.estado)}>
        {t(claveDeEstadoEntrega(entrega.estado), { defaultValue: entrega.estado })}
      </Badge>
      {/*
        `eventType` es el nombre PÚBLICO del evento (inglés, estable para terceros). No se traduce:
        es el identificador que el integrador ve del otro lado del webhook, y castellanizarlo acá
        haría que la pantalla y el payload hablen de cosas distintas.
      */}
      <span className="truncate font-mono font-medium text-fg-primario">{entrega.eventType}</span>
      <span className="text-fg-terciario">
        {t('centro.ticket.integraciones.intentos', { count: entrega.intentos })}
      </span>
      {entrega.httpStatus === null ? null : (
        <span className="font-mono text-fg-terciario">{entrega.httpStatus}</span>
      )}
      <span className="ml-auto text-fg-terciario">
        {formatearFechaHora(entrega.ultimoIntentoUtc, idioma)}
      </span>
    </li>
  )
}
