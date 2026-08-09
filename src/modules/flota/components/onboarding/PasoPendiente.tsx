import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Boton } from '@/shared/ui/Boton'
import { Icono } from '@/shared/ui/Icono'

/**
 * Pasos 2 (Dispositivo GPS) y 3 (Conductor) del wizard.
 *
 * En este slice se renderizan DESHABILITADOS con su hint, y "Saltar" NO EMITE NINGÚN REQUEST: los
 * endpoints de asignación llegan en los slices 03 y 04. Es la diferencia entre un paso honesto
 * ("todavía no, se hace desde el detalle") y un paso que llama a una ruta inexistente y muestra un
 * 404 que el usuario no puede resolver.
 *
 * Cuando esos slices existan, este mismo componente se reemplaza por el paso real — no se duplica
 * la pantalla.
 *
 * El vehículo del paso 1 YA ESTÁ CREADO: se recuerda su patente acá arriba para que quede claro que
 * saltar no pierde nada.
 */
export function PasoPendiente({
  icono,
  titulo,
  descripcion,
  hint,
  textoSaltar,
  onSaltar,
}: {
  icono: LucideIcon
  /** Todos ya resueltos por i18n. */
  titulo: string
  descripcion: string
  hint: string
  textoSaltar: string
  onSaltar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-borde bg-superficie-1 p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-superficie-2 text-fg-terciario">
          <Icono icono={icono} tamano="md" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-base font-semibold text-fg-primario">{titulo}</h2>
          <p className="text-sm text-fg-secundario">{descripcion}</p>
        </div>
      </div>

      <p className="rounded-lg border border-dashed border-borde bg-superficie-2 px-4 py-3 text-sm text-fg-secundario">
        {hint}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {/* Deshabilitado con su motivo: la acción existe en el flujo, la superficie todavía no. */}
        <Boton deshabilitado>{t('flota:onboarding.pasos.accionNoDisponible')}</Boton>
        <Boton variante="fantasma" onClick={onSaltar}>
          {textoSaltar}
        </Boton>
      </div>
    </section>
  )
}
