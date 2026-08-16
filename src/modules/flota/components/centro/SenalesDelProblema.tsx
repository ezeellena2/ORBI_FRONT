import { useTranslation } from 'react-i18next'
import type { ProblemaSenalDto } from '@/services/contracts/flota'
import { BloqueDelCentro } from './BloqueDelCentro'
import { formatearFechaHora } from '../detalle/formato'
import { claveDeOrigenSenal } from '../../vocabulario-centro-problemas'

/**
 * Las señales que el motor agrupó en este problema. Lo comparten el panel de la Sala y el tab
 * Resumen del ticket: es la misma lista y tiene que leerse igual en las dos.
 *
 * Es lo que hace **auditable** la bandeja: un problema con `senalesCount: 5` sin poder ver las 5
 * obliga a creerle al motor.
 *
 * `payloadResumen` **no se dibuja**: es el `jsonb` del productor, sin shape fijo ni copy, y volcarlo
 * crudo sería mostrarle al operador el payload de un evento.
 */
export function SenalesDelProblema({
  senales,
  idioma,
}: {
  senales: readonly ProblemaSenalDto[]
  idioma: string
}) {
  const { t } = useTranslation('flota')

  if (senales.length === 0) return null

  return (
    <BloqueDelCentro titulo={t('centro.sala.detalle.senales')}>
      <ul className="flex flex-col gap-1.5">
        {senales.map((senal) => (
          <li
            key={senal.id}
            className="flex flex-wrap items-baseline gap-x-2 rounded-sm border border-borde px-2 py-1.5 text-xs"
          >
            <span className="text-fg-terciario">
              {t(claveDeOrigenSenal(senal.origen), { defaultValue: senal.origen })}
            </span>
            <span className="font-medium text-fg-primario">{senal.titulo}</span>
            <span className="text-fg-secundario">
              {senal.detalle ?? t('centro.sala.detalle.senalSinDetalle')}
            </span>
            <span className="ml-auto text-fg-terciario">
              {formatearFechaHora(senal.detectadaUtc, idioma)}
            </span>
          </li>
        ))}
      </ul>
    </BloqueDelCentro>
  )
}
