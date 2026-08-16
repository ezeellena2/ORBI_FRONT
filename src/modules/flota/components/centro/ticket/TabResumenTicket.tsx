import { useTranslation } from 'react-i18next'
import { Lightbulb } from 'lucide-react'
import type { ProblemaOperativoDetalleDto } from '@/services/contracts/flota'
import { BloqueDelCentro } from '../BloqueDelCentro'
import { SenalesDelProblema } from '../SenalesDelProblema'
import { claveDeTipoProblema } from '../../../vocabulario-centro-problemas'

/**
 * Tab **Resumen** del ticket (ficha §6): qué pasó + señales agrupadas + acción sugerida.
 *
 * El tipo del problema se muestra acá y no en el hero: es catálogo (`tipos_problema_flota`), o sea
 * la clasificación del motor, y su lugar natural está al lado de la descripción que explica el caso
 * — no compitiendo con los 3 badges que el operador lee de un golpe.
 */
export function TabResumenTicket({ detalle }: { detalle: ProblemaOperativoDetalleDto }) {
  const { t, i18n } = useTranslation('flota')

  return (
    <div className="flex flex-col gap-4">
      <BloqueDelCentro titulo={t('centro.sala.detalle.quePaso')}>
        <p className="text-sm text-fg-secundario">
          {detalle.descripcion.trim() === ''
            ? t('centro.sala.detalle.sinDescripcion')
            : detalle.descripcion}
        </p>
        <p className="text-xs text-fg-terciario">
          {t('centro.ticket.tipoDeProblema', {
            tipo: t(claveDeTipoProblema(detalle.tipo), { defaultValue: detalle.tipo }),
          })}
        </p>
      </BloqueDelCentro>

      {detalle.accionSugerida.trim() === '' ? null : (
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-accion" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-fg-primario">
              {t('centro.sala.detalle.accionSugerida')}
            </p>
            <p className="text-sm text-fg-secundario">{detalle.accionSugerida}</p>
          </div>
        </div>
      )}

      <SenalesDelProblema senales={detalle.senales} idioma={i18n.language} />

      {/*
        Un problema SIN señales es posible y no es un error: el motor puede haberlo abierto por un
        predicado de estado. Decirlo evita que el operador crea que la lista no cargó.
      */}
      {detalle.senales.length === 0 ? (
        <p className="text-xs text-fg-terciario">{t('centro.ticket.sinSenales')}</p>
      ) : null}
    </div>
  )
}
