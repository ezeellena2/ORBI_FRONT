import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '@/stores/session-store'
import { cn } from '@/shared/utils/cn'

/**
 * Estado vacío del Dashboard: la puerta de entrada de una organización recién creada.
 *
 * ── POR QUE ACA YA NO HAY UN FORMULARIO ───────────────────────────────────────────────────────
 * Hasta el cierre de slice-03 esta pantalla renderizaba un wizard de 3 pasos propio
 * (`WizardStep1/2/3`) que pedía patente, marca, año, **IMEI, modelo de GPS y número de SIM**… y
 * **no guardaba absolutamente nada**: cero `useMutation`, cero service, cero HTTP (medido: los 3
 * pasos completos con `api: []`). El usuario cargaba su primer vehículo, apretaba "Crear vehículo y
 * continuar" y el dato se perdía. Encima el paso 2 ofrecía una lista de modelos GPS **hardcodeada**
 * (`Queclink GV75W`, `Concox GT06N`, …), que es exactamente lo contrario del catálogo growable que
 * el módulo sirve por API — dos verdades del mismo catálogo, y la falsa era la primera que veía un
 * usuario nuevo.
 *
 * El wizard REAL existe, está construido contra el contrato y funciona:
 * `/app/flota/vehiculos/onboarding` (`OnboardingFlotaPage`, pasos `PasoVehiculo` + `PasoDispositivo`).
 * Esta superficie ahora ANUNCIA los 3 pasos y manda ahí, en vez de duplicarlos mal.
 *
 * ── EL CTA SE GATEA POR MODULO, NO POR PERMISO ────────────────────────────────────────────────
 * El destino vive bajo `RequiereModulo("flota")`. Una organización sin Flota activo que clickee
 * aterrizaría en el bloqueo del módulo sin entender por qué, así que sin el módulo no se dibuja el
 * botón: queda la explicación de los 3 pasos, que sigue siendo cierta.
 *
 * ⚠️ PENDIENTE DEL PO: qué muestra el Dashboard vacío de una organización que **no** tiene Flota
 * (hoy: el mismo texto, sin CTA). Es una decisión de producto, no de este slice.
 */

const RUTA_WIZARD_REAL = '/app/flota/vehiculos/onboarding'

interface Props {
  /** "Ahora no": esconde el estado vacío sin tocar el backend. Es solo preferencia de vista. */
  onComplete: () => void
}

function PasoAnunciado({ numero, titulo, descripcion }: {
  numero: number
  /** Ya resueltos por i18n. */
  titulo: string
  descripcion: string
}) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full',
          'bg-superficie-3 text-xs font-semibold text-fg-secundario',
        )}
        aria-hidden
      >
        {numero}
      </span>
      <div>
        <p className="text-sm font-medium text-fg-primario">{titulo}</p>
        <p className="mt-0.5 text-sm text-fg-secundario">{descripcion}</p>
      </div>
    </li>
  )
}

export function DashboardOnboarding({ onComplete }: Props) {
  const { t } = useTranslation()
  // `?? []` AFUERA del selector: adentro construye un array nuevo por lectura y `useSyncExternalStore`
  // lo lee como un snapshot distinto en cada render (mismo bug que ya se corrigió en `SidebarNav`,
  // `RequierePermiso` y `RequiereModulo`).
  const modulosDeLaOrg = useSessionStore((s) => s.organizacionActiva?.modulos)
  const flotaActivo = (modulosDeLaOrg ?? []).includes('flota')

  return (
    <section className="mx-auto max-w-2xl" aria-label={t('shell.dashboard.onboarding.kicker')}>
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-marca">
          {t('shell.dashboard.onboarding.kicker')}
        </p>
        <h1 className="text-xl font-semibold text-fg-primario">
          {t('shell.dashboard.onboarding.title')}
        </h1>
        <p className="mt-1.5 text-sm text-fg-secundario">
          {t('shell.dashboard.onboarding.subtitle')}
        </p>
      </div>

      <div className="rounded-2xl border border-borde bg-superficie-1 p-6 shadow-sm">
        <ol className="flex flex-col gap-4">
          <PasoAnunciado
            numero={1}
            titulo={t('shell.dashboard.onboarding.step1Label')}
            descripcion={t('shell.dashboard.onboarding.step1Desc')}
          />
          <PasoAnunciado
            numero={2}
            titulo={t('shell.dashboard.onboarding.step2Label')}
            descripcion={t('shell.dashboard.onboarding.step2Desc')}
          />
          <PasoAnunciado
            numero={3}
            titulo={t('shell.dashboard.onboarding.step3Label')}
            descripcion={t('shell.dashboard.onboarding.step3Desc')}
          />
        </ol>

        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-borde pt-4">
          <button
            type="button"
            onClick={onComplete}
            className="rounded-lg px-4 py-2 text-sm text-fg-secundario transition-colors hover:bg-superficie-2 hover:text-fg-primario focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-foco/35"
          >
            {t('shell.dashboard.onboarding.later')}
          </button>
          {flotaActivo ? (
            <Link
              to={RUTA_WIZARD_REAL}
              className="rounded-lg bg-accion px-4 py-2 text-sm font-medium text-accion-fg transition-colors hover:bg-accion-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-foco/35"
            >
              {t('shell.dashboard.onboarding.start')}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}
