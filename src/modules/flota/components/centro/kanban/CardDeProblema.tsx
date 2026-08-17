import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { GripVertical } from 'lucide-react'
import type { ProblemaOperativoListItemDto } from '@/services/contracts/flota'
import { cn } from '@/shared/utils/cn'
import { BadgeSeveridadProblema, BadgeSlaProblema } from '../BadgesDelCentro'
import { claseDeFondoPorVariante } from '../formato-centro'
import { formatearFechaHora } from '../../detalle/formato'
import { varianteDeSeveridadProblema } from '../../../vocabulario-centro-problemas'
import { patenteDelProblema } from '../../../vocabulario-sala-problemas'

/**
 * Una card del tablero (ficha §4.2): head (badge severidad) · título · meta (patente) · pie
 * (responsable + SLA).
 *
 * ── LA CARD ENTERA ES UN LINK AL TICKET ───────────────────────────────────────────────────────
 * En la Sala el 1.er click **selecciona** (hay un panel de detalle al lado que se llena). Acá no hay
 * panel: el tablero es una vista de conjunto, así que el click va directo al ticket. Es un `<a>` y
 * no un `onClick` con `navigate` a propósito — deja abrir el caso en otra pestaña sin perder el
 * tablero, que es lo que un operador hace cuando está repasando la columna.
 *
 * ── EL ASA DE ARRASTRE SE DIBUJA Y ESTÁ APAGADA ───────────────────────────────────────────────
 * Con `arrastrable = false` la card **no es `draggable`** y el asa va con `aria-disabled` y el
 * motivo en el tooltip. Es la regla dura del módulo: *"o no va, o va deshabilitada con el motivo
 * visible"*. Se dibuja (en vez de esconderla) porque la capacidad existe en el diseño del tablero y
 * el operador tiene que poder entender por qué no puede mover una card, en vez de arrastrarla y
 * concluir que la pantalla está rota. El porqué completo está en `vocabulario-kanban-problemas.ts`.
 *
 * ── EL CÓDIGO DE LA REGLA NO SE DIBUJA ────────────────────────────────────────────────────────
 * La ficha lo pone en el head de la card (`DTC-CRIT-01` en el mockup). El vínculo problema → regla
 * **no existe como columna** (PENDIENTE #8): ningún campo del DTO lo trae. En su lugar va la hora de
 * detección, que sí es real y es lo que ordena la lectura de una columna.
 */
export function CardDeProblema({
  problema,
  arrastrable,
  motivoDeArrastreApagado,
}: {
  problema: ProblemaOperativoListItemDto
  arrastrable: boolean
  /** Ya resuelto por i18n. Solo se usa cuando `arrastrable` es `false`. */
  motivoDeArrastreApagado: string
}) {
  const { t, i18n } = useTranslation('flota')

  const patente = patenteDelProblema(problema.vehiculo)

  return (
    <li>
      <Link
        to={`?ticket=${problema.id}`}
        className="flex items-stretch gap-2 rounded-lg border border-borde bg-superficie-2 px-2.5 py-2 transition-colors duration-150 ease-out hover:border-borde-hover hover:bg-superficie-3"
      >
        {/* Barra de severidad. El color NO es el único portador: al lado va el badge con su texto. */}
        <span
          aria-hidden
          className={cn(
            'w-1 shrink-0 rounded-full',
            claseDeFondoPorVariante(varianteDeSeveridadProblema(problema.severidad)),
          )}
        />

        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <BadgeSeveridadProblema severidad={problema.severidad} />
            <span className="text-xs text-fg-terciario">
              {formatearFechaHora(problema.fechaDeteccionUtc, i18n.language)}
            </span>
          </span>

          <span className="line-clamp-2 text-sm font-medium text-fg-primario">
            {problema.titulo}
          </span>

          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-secundario">
            {patente === null ? null : <span className="font-mono">{patente}</span>}
            <span>{problema.responsable?.nombre ?? t('centro.sala.cola.sinResponsable')}</span>
          </span>

          <span className="flex">
            <BadgeSlaProblema sla={problema.sla} />
          </span>
        </span>

        <span
          aria-disabled={arrastrable ? undefined : 'true'}
          title={arrastrable ? undefined : motivoDeArrastreApagado}
          className={cn(
            'flex shrink-0 items-center',
            arrastrable ? 'cursor-grab text-fg-terciario' : 'cursor-not-allowed text-fg-terciario opacity-40',
          )}
        >
          <GripVertical className="size-4" aria-hidden />
          {arrastrable ? null : <span className="sr-only">{motivoDeArrastreApagado}</span>}
        </span>
      </Link>
    </li>
  )
}
