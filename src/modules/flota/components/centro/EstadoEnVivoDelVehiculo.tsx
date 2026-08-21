import { useTranslation } from 'react-i18next'
import type { ProblemaOperativoDetalleDto } from '@/services/contracts/flota'
import { Aviso } from '@/shared/ui/Aviso'
import { BloqueDelCentro } from './BloqueDelCentro'
import { SIN_DATO, formatearFechaHora } from '../detalle/formato'

/**
 * El estado en vivo del vehículo — el **partial-data de verdad** del Centro (D-C1 a). Lo comparten
 * el panel de contexto de la Sala y el aside del ticket.
 *
 * Si Telemetría no responde, `contextoOperativo` viaja **entero en `null`** y el problema se sirve
 * igual con 200: no es una pantalla de error, es un bloque que falta. Se avisa y el resto queda
 * intacto.
 *
 * ── LO QUE NO SE DIBUJA DE ESTE OBJETO ────────────────────────────────────────────────────────
 *  - **`criticidadActivo`**: viaja **siempre `null`** (el modelo no tiene marca de activo crítico).
 *    Un badge que nunca aparece es una capacidad fantasma; uno con un valor inventado sería peor.
 *  - **`viajeActivo`**: el backend lo **deriva de `ignicion`** (Telemetría no modela viajes, B-9).
 *    Mostrarlo al lado de la ignición sería decir dos veces el mismo hecho con dos nombres.
 *  - **`geozonaActual`**: DIFERIDO DA-08, siempre `null`.
 *
 * `ignicion` es `boolean | null` y el `null` **no es "apagado"**: es que no sabemos. Por eso las 3
 * ramas y no un ternario de 2.
 */
export function EstadoEnVivoDelVehiculo({
  detalle,
}: {
  detalle: ProblemaOperativoDetalleDto
}) {
  const { t, i18n } = useTranslation('flota')

  if (detalle.vehiculo === null) {
    return (
      <BloqueDelCentro titulo={t('centro.sala.contexto.operativo')}>
        <p className="text-xs text-fg-terciario">{t('centro.sala.contexto.sinVehiculo')}</p>
      </BloqueDelCentro>
    )
  }

  if (detalle.contextoOperativo === null) {
    return (
      <BloqueDelCentro titulo={t('centro.sala.contexto.operativo')}>
        <Aviso
          titulo={t('centro.problemas.datosParciales.titulo')}
          mensaje={t('centro.problemas.datosParciales.descripcion')}
        />
      </BloqueDelCentro>
    )
  }

  const contexto = detalle.contextoOperativo

  const claveDeIgnicion =
    contexto.ignicion === null
      ? null
      : contexto.ignicion
        ? 'centro.sala.contexto.ignicionSi'
        : 'centro.sala.contexto.ignicionNo'

  return (
    <BloqueDelCentro titulo={t('centro.sala.contexto.operativo')}>
      <dl className="flex flex-col gap-1 text-xs">
        <Fila
          etiqueta={t('centro.sala.contexto.ignicion')}
          valor={claveDeIgnicion === null ? SIN_DATO : t(claveDeIgnicion)}
        />
        <Fila
          etiqueta={t('centro.sala.contexto.velocidad')}
          valor={
            contexto.velocidadKmH === null
              ? SIN_DATO
              : t('centro.sala.contexto.velocidadValor', { valor: contexto.velocidadKmH })
          }
        />
        <Fila
          etiqueta={t('centro.sala.contexto.ultimaSenal')}
          valor={formatearFechaHora(contexto.ultimaSenalUtc, i18n.language)}
        />
      </dl>
    </BloqueDelCentro>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-fg-terciario">{etiqueta}</dt>
      <dd className="text-fg-primario">{valor}</dd>
    </div>
  )
}
