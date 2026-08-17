import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/ui/Badge'
import { Card } from '@/shared/ui/Card'
import { EVENTOS_PUBLICOS_WEBHOOK } from '../../../vocabulario-centro-problemas'

/**
 * Card "Eventos disponibles" — el **catalogo publico de 14 nombres**, read-only e informativo.
 *
 * ══ SON 14 Y NO LOS 12 DEL MOCKUP ═══════════════════════════════════════════════════════════════
 * `api.md` §Catalogo de eventos de webhook publica **14**; al mockup le faltan
 * `problem.priority_changed` y `problem.assigned`. Manda el contrato. `webhook.test` **no se lista**:
 * es exclusivo del endpoint de prueba y no es suscribible.
 *
 * ══ LOS NOMBRES NO SE TRADUCEN ══════════════════════════════════════════════════════════════════
 * Nomenclatura **dual por diseno**: los nombres publicos son en ingles y estables para terceros; el
 * bus interno va en espanol (`flota.<recurso-y-hecho>.v1`). Traducirlos rompe la correspondencia con
 * lo que el integrador ve llegar en `X-Orbi-Event-Type`.
 *
 * ══ "NO DISPONIBLE" NO ES "TODAVIA NO" ══════════════════════════════════════════════════════════
 * Los 2 de geozona dependen de **DA-08** (no hay una sola linea de logica de geozona en la solucion)
 * y `maintenance.due` del servicio **Operaciones, que no existe**. Se marcan, no se esconden: un
 * catalogo recortado le haria creer al integrador que esos hechos no existen en el producto.
 *
 * ══ ⚠️ Y LO QUE VALE PARA LOS 14 ════════════════════════════════════════════════════════════════
 * Hoy **ningun endpoint tiene suscripciones**, porque el alta no acepta `eventos[]` (PENDIENTE #3).
 * Esta lista describe el **catalogo**, no lo que va a llegar — y esa frase esta en la card, arriba de
 * las pills, no en un tooltip.
 */
export function CardEventosDisponibles() {
  const { t } = useTranslation('flota')

  return (
    <Card titulo={t('centro.integraciones.eventos.titulo')}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-fg-secundario">
          {t('centro.integraciones.eventos.aclaracionSinSuscripciones')}
        </p>

        <ul className="flex flex-wrap gap-1.5">
          {EVENTOS_PUBLICOS_WEBHOOK.map((evento) => (
            <li key={evento.nombre}>
              <Badge variante={evento.disponible ? 'neutro' : 'advertencia'}>
                <span className="font-mono">{evento.nombre}</span>
                {evento.disponible ? null : (
                  <span className="ml-1">{t('centro.integraciones.eventos.noDisponible')}</span>
                )}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
