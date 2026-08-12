import { useTranslation } from 'react-i18next'
import { Gauge, Route, Timer, TrendingUp } from 'lucide-react'
import { Icono } from '@/shared/ui/Icono'
import { SIN_DATO } from '../../detalle/formato'

/**
 * Las 4 mini-stats del hero (km, horas al volante, viajes, score) — `f-06` §3.
 *
 * ── ⚠️ SE RENDERIZAN EN FALLBACK Y **NO SE PIDE NADA** ────────────────────────────────────────
 * `GET /conductores/{id}/stats` responde **SIEMPRE 500 `flota.telemetria.no_disponible`** por
 * contrato (convencion 8b): Telemetria **no modela conductores** y no persiste historico de
 * posiciones (A-1 / B-9). El stub existe para que un cliente reciba un `code` en vez de un 404 de
 * routing, **no para que se lo llame**.
 *
 * Por eso esta tira **no emite el request**: disparar una llamada cuyo unico desenlace posible es un
 * 500 mete un error en la consola de todos los usuarios y ensucia la telemetria de errores del front.
 *
 * ── POR QUE SE DIBUJAN IGUAL, EN VEZ DE ESCONDERLAS ───────────────────────────────────────────
 * `f-06` §3 es literal: "se renderizan con fallback `—` y la leyenda «Sin datos de telemetria».
 * **Prohibido** simular valores o mostrar 0". Un `0` se lee como "este conductor no manejo nada", que
 * es una afirmacion falsa; el `—` dice "no lo sabemos", que es la verdad. Y mantener las tarjetas
 * visibles explica **por que** el dato falta, en vez de dejar un hueco silencioso donde el usuario
 * cree que la feature no existe.
 *
 * Cuando Telemetria persista viajes (slice-05), esto pasa a leer del endpoint sin mover el layout.
 */
export function MiniStatsConductor() {
  const { t } = useTranslation(['flota', 'common'])

  const tarjetas = [
    { clave: 'kmTotales', icono: Route },
    { clave: 'horas', icono: Timer },
    { clave: 'viajes', icono: Gauge },
    { clave: 'score', icono: TrendingUp },
  ] as const

  return (
    <section aria-label={t('flota:conductorDetalle.miniStats.titulo')}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((tarjeta) => (
          <div
            key={tarjeta.clave}
            className="flex flex-col gap-1 rounded-xl border border-borde bg-superficie-1 p-4"
          >
            <span className="flex items-center gap-1.5 text-xs text-fg-secundario">
              <Icono icono={tarjeta.icono} tamano="xs" />
              {t(`flota:conductorDetalle.miniStats.${tarjeta.clave}`)}
            </span>
            <span className="text-2xl font-semibold text-fg-terciario">{SIN_DATO}</span>
            <span className="text-xs text-fg-terciario">
              {t('flota:conductorDetalle.miniStats.sinFuente')}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
