import { useTranslation } from 'react-i18next'
import { History, MessageSquareOff } from 'lucide-react'
import type {
  ProblemaOperativoDetalleDto,
  ProblemaTimelineItemDto,
} from '@/services/contracts/flota'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { formatearFechaHora } from '../../detalle/formato'
import { claveDeTipoTimeline } from '../../../vocabulario-centro-problemas'
import { COMENTARIOS_DISPONIBLES } from '../../../vocabulario-ticket-problema'

/**
 * Tab **Línea de tiempo** del ticket: el feed de actividad del caso.
 *
 * ── ES EL FEED DE ACTIVIDAD, NO UNA SEGUNDA LISTA ─────────────────────────────────────────────
 * La ficha §2 pide un tab "Línea de tiempo" **y** un feed de actividad abajo del grid. Los dos
 * saldrían de `timeline[]` (`comentarios[]` es su subconjunto con `tipo: 'comentario'`, mismo
 * shape), así que renderizar los dos mostraría la misma lista dos veces en la misma pantalla. Se
 * dibuja **una** y es esta. Desviación declarada de la ficha §2.
 *
 * ── EL INPUT DE COMENTARIO NO SE DIBUJA ───────────────────────────────────────────────────────
 * `POST /problemas/{id}/comentarios` **no está enrutado** (PENDIENTE #17: la fila de timeline exige
 * `titulo` NOT NULL y el request trae un solo campo de texto). Un textarea deshabilitado con un
 * botón muerto sería un control permanente para una operación que el backend no puede completar; en
 * su lugar va **la línea que dice por qué**, que es lo único que el operador necesita saber para no
 * quedarse esperando poder anotar algo.
 */
export function TabTimelineTicket({ detalle }: { detalle: ProblemaOperativoDetalleDto }) {
  const { t, i18n } = useTranslation('flota')

  return (
    <div className="flex flex-col gap-4">
      {detalle.timeline.length === 0 ? (
        <EstadoVacio
          variante="sin-datos"
          icono={History}
          titulo={t('centro.ticket.timelineVacio.titulo')}
          descripcion={t('centro.ticket.timelineVacio.descripcion')}
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {detalle.timeline.map((item) => (
            <FilaDeTimeline key={item.id} item={item} idioma={i18n.language} />
          ))}
        </ol>
      )}

      {COMENTARIOS_DISPONIBLES ? null : (
        <p className="flex items-start gap-2 rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
          <MessageSquareOff className="mt-0.5 size-4 shrink-0 text-fg-terciario" aria-hidden />
          {t('centroBloqueado.comentar')}
        </p>
      )}
    </div>
  )
}

/**
 * Una fila del hilo.
 *
 * El punto de la izquierda es decorativo y **no porta información sola**: el tipo del hecho va como
 * texto al lado (`detectado`, `asignado`, `silenciado`…), porque un feed que distingue eventos solo
 * por color es ilegible para quien no ve el color.
 */
function FilaDeTimeline({ item, idioma }: { item: ProblemaTimelineItemDto; idioma: string }) {
  const { t } = useTranslation('flota')

  return (
    <li className="flex gap-3">
      <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-borde-hover" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium text-fg-primario">{item.titulo}</span>
          <span className="text-xs text-fg-terciario">
            {t(claveDeTipoTimeline(item.tipo), { defaultValue: item.tipo })}
          </span>
          <span className="ml-auto text-xs text-fg-terciario">
            {formatearFechaHora(item.fechaUtc, idioma)}
          </span>
        </div>

        {item.detalle === null ? null : (
          <p className="text-sm text-fg-secundario">{item.detalle}</p>
        )}

        {/*
          El autor sale del snapshot que el backend congeló al registrar el hecho. `null` es legal y
          NO es "el sistema": es que la fila no guardó usuario — decir "Sistema" atribuiría a un
          proceso automático algo que quizás hizo una persona.
        */}
        {item.usuario === null ? null : (
          <p className="text-xs text-fg-terciario">
            {t('centro.ticket.porUsuario', { nombre: item.usuario.nombre })}
          </p>
        )}
      </div>
    </li>
  )
}
