import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/ui/Badge'
import type {
  EstadoProblema,
  ProblemaSlaDto,
  SeveridadProblema,
} from '@/services/contracts/flota'
import {
  claveDeEstadoProblema,
  claveDeSeveridadProblema,
  varianteDeEstadoProblema,
  varianteDeSeveridadProblema,
} from '../../vocabulario-centro-problemas'
import { lecturaDeSla } from '../../vocabulario-sala-problemas'

/**
 * Los 3 badges del Centro de Problemas, en un solo archivo porque siempre viajan juntos: severidad,
 * estado y plazo aparecen en la misma línea en la cola, en el hero del detalle y en el timeline.
 *
 * El mapeo `código de catálogo → variante + label` vive en `vocabulario-centro-problemas.ts`; acá
 * solo se arma el JSX. `Badge` es tonto a propósito (no conoce códigos), y esa separación es la que
 * permite anclar el mapeo por test sin montar componentes.
 */

export function BadgeSeveridadProblema({ severidad }: { severidad: SeveridadProblema }) {
  const { t } = useTranslation('flota')

  return (
    <Badge variante={varianteDeSeveridadProblema(severidad)} punto>
      {t(claveDeSeveridadProblema(severidad), { defaultValue: severidad })}
    </Badge>
  )
}

export function BadgeEstadoProblema({ estado }: { estado: EstadoProblema }) {
  const { t } = useTranslation('flota')

  return (
    <Badge variante={varianteDeEstadoProblema(estado)}>
      {t(claveDeEstadoProblema(estado), { defaultValue: estado })}
    </Badge>
  )
}

/**
 * El reloj de SLA.
 *
 * ── LAS 4 FORMAS NO SON INTERCAMBIABLES ───────────────────────────────────────────────────────
 * `sin_plazo` es **neutro**, no verde: el problema no tiene reloj, y pintarlo como éxito afirmaría
 * que va bien un caso que nadie está midiendo. Es la misma clase de mentira que pintar `sin_dato`
 * como "desconectado" en el badge de conexión (slice-05).
 *
 * ⚠️ **El ámbar de "por vencer" no se dibuja nunca**: `EstadoSlaDerivado` no emite `por_vencer`
 * porque ningún documento fija el umbral, y derivarlo acá con `minutosRestantes` sería inventar el
 * mismo número en otro archivo. La variante sigue en el mapa del vocabulario porque el union del
 * contrato la declara; lo que no existe es el camino que la produce.
 */
export function BadgeSlaProblema({ sla }: { sla: ProblemaSlaDto }) {
  const { t } = useTranslation('flota')

  const lectura = lecturaDeSla(sla)

  if (lectura.forma === 'sin_plazo') {
    return <Badge variante="neutro">{t('centro.sala.sla.sinPlazo')}</Badge>
  }

  if (lectura.forma === 'sin_dato') {
    return <Badge variante="neutro">{t('centro.sala.sla.sinDato')}</Badge>
  }

  return lectura.forma === 'vencido' ? (
    <Badge variante="peligro" punto>
      {t('centro.sala.sla.vencido', { count: lectura.minutos })}
    </Badge>
  ) : (
    <Badge variante="exito">{t('centro.sala.sla.enPlazo', { count: lectura.minutos })}</Badge>
  )
}
