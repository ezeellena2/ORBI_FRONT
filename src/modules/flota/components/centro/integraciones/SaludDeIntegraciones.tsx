import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/Skeleton'
import type { SaludDeIntegraciones as Salud } from '../../../vocabulario-integraciones'

/**
 * Health grid de la pantalla de integraciones — ficha §3, **3 tarjetas y no 4**.
 *
 * ── LA 4.ª NO SE RENDERIZA ────────────────────────────────────────────────────────────────────
 * "API keys" es **fase 2** (decision #5): sin modelo de scopes ni resolucion de tenant por key, y
 * `ApiKeyDto` **nunca se definio**. No hay un solo texto "API key" en esta pantalla.
 *
 * ── 2 DE LAS 3 VAN EN `—`, Y NO ES QUE ESTEN EN CERO ──────────────────────────────────────────
 * "Entregas 24 h / % exitosas" y "Fallos abiertos" son **DA-IN-04 abierta**: ni la formula ni la
 * ventana estan definidas. Y aunque lo estuvieran, `GET /webhooks/entregas` devuelve una **pagina**
 * del log de toda la organizacion: contar sobre ella daria un numero que cambia al paginar (la misma
 * trampa de B-35). Un `0` en "Fallos abiertos" afirmaria que no hay ninguno.
 *
 * Estas son **widgets operativos**, no KPIs: por eso es una tira compacta y no un `kpi-grid`
 * (regla de KPIs del `CLAUDE.md` raiz, no negociable).
 */
export function SaludDeIntegraciones({ salud, cargando }: { salud: Salud; cargando: boolean }) {
  const { t } = useTranslation('flota')

  if (cargando) {
    return <Skeleton variante="linea" className="h-14 w-full" />
  }

  return (
    <section
      aria-label={t('centro.integraciones.salud.titulo')}
      className="flex flex-col gap-1 rounded-lg border border-borde bg-superficie-1 px-4 py-3"
    >
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <Tarjeta
          etiqueta={t('centro.integraciones.salud.activos')}
          valor={String(salud.activos)}
          detalle={t('centro.integraciones.salud.activosDetalle', {
            total: salud.total,
            count: salud.total,
          })}
        />
        <Tarjeta
          etiqueta={t('centro.integraciones.salud.entregas')}
          valor={t('centro.integraciones.salud.sinDato')}
          detalle={t('centro.integraciones.salud.entregasDetalle')}
        />
        <Tarjeta
          etiqueta={t('centro.integraciones.salud.fallos')}
          valor={t('centro.integraciones.salud.sinDato')}
          detalle={t('centro.integraciones.salud.fallosDetalle')}
        />
      </div>

      {salud.esDeLaPagina ? (
        <p className="text-xs text-fg-terciario">{t('centro.integraciones.salud.deLaPagina')}</p>
      ) : null}
    </section>
  )
}

function Tarjeta({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string
  valor: string
  detalle: string
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-fg-terciario">{etiqueta}</span>
      <span className="text-lg font-semibold tabular-nums text-fg-primario">{valor}</span>
      <span className="text-xs text-fg-secundario">{detalle}</span>
    </div>
  )
}
