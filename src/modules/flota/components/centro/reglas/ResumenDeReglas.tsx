import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/Skeleton'
import type { ResumenDeReglas as Resumen } from '../../../vocabulario-reglas-problemas'

/**
 * Resumen operativo de la pantalla de reglas — ficha §3.
 *
 * ── NO ES UN `kpi-grid`, Y ESO ES REGLA DEL REPO ──────────────────────────────────────────────
 * El mockup dibuja 4 tarjetas grandes de metrica. La **regla de KPIs** del `CLAUDE.md` raiz es no
 * negociable: los KPIs gerenciales van al dashboard b2b y a Reportes, y ninguna pantalla interna
 * lleva muro de metricas. Esto es un **widget operativo** —contexto para configurar, no medicion del
 * negocio— y por eso es una tira compacta y no 4 cards.
 *
 * ── LOS 3 CONTADORES DICEN DE DONDE SALEN ─────────────────────────────────────────────────────
 * No existe endpoint agregado (la misma clase de hueco que **B-35**). Se calculan sobre lo que
 * llego, y `esDeLaPagina` decide si eso es la organizacion entera (una sola pagina) o solo la pagina
 * cargada. En el segundo caso **se rotula**, porque el numero cambia al paginar.
 *
 * ── EL CUARTO CONTADOR VA EN `—` Y NO EN `0` ──────────────────────────────────────────────────
 * "Activaciones 24 h" tiene **dos** bloqueos: `ultimasActivacionesCount` viaja en 0 SIEMPRE (no
 * existe el vinculo problema -> regla, PENDIENTE #8) y la ventana de 24 h es **DA-PR-04 abierta**.
 * Un `0` afirmaria que el motor no disparo nada, que es exactamente lo que nadie verifico.
 */
export function ResumenDeReglas({
  resumen,
  cargando,
}: {
  resumen: Resumen
  cargando: boolean
}) {
  const { t } = useTranslation('flota')

  if (cargando) {
    return <Skeleton variante="linea" className="h-14 w-full" />
  }

  return (
    <section
      aria-label={t('centro.reglas.resumen.titulo')}
      className="flex flex-col gap-1 rounded-lg border border-borde bg-superficie-1 px-4 py-3"
    >
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <Contador
          etiqueta={t('centro.reglas.resumen.activas')}
          valor={String(resumen.activas)}
          detalle={t('centro.reglas.resumen.activasDetalle', {
            total: resumen.total,
            count: resumen.total,
          })}
        />
        <Contador
          etiqueta={t('centro.reglas.resumen.criticas')}
          valor={String(resumen.criticas)}
          detalle={t('centro.reglas.resumen.criticasDetalle')}
        />
        <Contador
          etiqueta={t('centro.reglas.resumen.activaciones')}
          valor={t('centro.reglas.resumen.sinDato')}
          detalle={t('centro.reglas.resumen.activacionesDetalle')}
        />
        <Contador
          etiqueta={t('centro.reglas.resumen.conWebhook')}
          valor={String(resumen.conWebhook)}
          detalle={t('centro.reglas.resumen.conWebhookDetalle')}
        />
      </div>

      {resumen.esDeLaPagina ? (
        <p className="text-xs text-fg-terciario">{t('centro.reglas.resumen.deLaPagina')}</p>
      ) : null}
    </section>
  )
}

function Contador({
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
