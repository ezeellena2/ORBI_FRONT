import { useTranslation } from 'react-i18next'
import { FileSpreadsheet } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { Icono } from '@/shared/ui/Icono'
import { AccionConMotivo } from '../AccionConMotivo'
import { usePermisos } from '../../hooks/usePermisos'

/**
 * Alt-CTA "Importar CSV" — gateada con `flota.vehiculos.importar` y **sin endpoint que la cumpla**.
 *
 * ⚠️ Este bloque decia "import/export llega en slice-05". Slice-05 CERRO el 2026-08-12 **sin
 * construir ninguno de los dos**: el import sigue en **P4** (no estan definidos el shape del
 * resultado, el `code` por fila ni el transporte del CSV, que en v1 no puede ser binario por D-C2) y
 * el export en **B-34**. No hay slice dueno: lo que falta es una decision del PO, no un paso.
 *
 * Se muestra DESHABILITADA con su motivo, no con el toast "Próximamente" del mockup: un toast que
 * aparece y se va no se puede leer dos veces ni copiar, y no dice si el problema es el permiso o la
 * función. El motivo distingue las dos cosas.
 */
export function AltCtaImportarCsv() {
  const { t } = useTranslation(['flota', 'common'])
  const { tienePermiso } = usePermisos()

  const motivo = tienePermiso('flota.vehiculos.importar')
    ? t('flota:onboarding.importar.motivoSlice')
    : t('flota:detalle.acciones.sinPermiso', { permiso: 'flota.vehiculos.importar' })

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-borde bg-superficie-1/40 px-5 py-4">
      <span className="flex size-10 items-center justify-center rounded-full bg-superficie-2 text-fg-terciario">
        <Icono icono={FileSpreadsheet} tamano="md" />
      </span>

      <p className="min-w-0 flex-1 text-sm text-fg-secundario">
        <strong className="block font-semibold text-fg-primario">
          {t('flota:onboarding.importar.titulo')}
        </strong>
        {t('flota:onboarding.importar.descripcion')}
      </p>

      <AccionConMotivo motivo={motivo}>
        <Boton variante="superficie" tamano="sm" deshabilitado>
          {t('flota:onboarding.importar.cta')}
        </Boton>
      </AccionConMotivo>
    </section>
  )
}
