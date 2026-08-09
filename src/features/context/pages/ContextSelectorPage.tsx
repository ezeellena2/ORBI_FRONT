import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { User, Building2, ChevronRight } from 'lucide-react'
import { useContextSwitch } from '../hooks/useContextSwitch'
import { useContextSelectorView } from '../hooks/useContextSelectorView'
import { Alert } from '@/shared/ui/legacy/Alert'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { OrganizacionDisponible } from '@/services/contracts/auth'

/**
 * Selector de organizacion post-login, alineado con mockup login/selector.html.
 * Muestra cuenta personal + organizaciones disponibles.
 * Deriva personal/empresa desde esMicroOrg — sin tipo_contexto.
 */
export function ContextSelectorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { snapshot, organizacionActiva, personalOrg, empresaOrgs } = useContextSelectorView()
  const contextSwitch = useContextSwitch()

  const generalError = contextSwitch.error
    ? resolveApiErrorMessage(parseApiError(contextSwitch.error), t)
    : null

  if (!snapshot) return null

  function handleSelect(org: OrganizacionDisponible) {
    if (org.id === organizacionActiva?.id) {
      navigate('/app', { replace: true })
      return
    }
    contextSwitch.mutate({ organizacionId: org.id })
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-cyan)]/10 text-lg font-semibold text-[var(--color-brand-cyan)]">
          {snapshot.nombre[0]}
          {snapshot.apellido[0]}
        </div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {t('context.selector.greeting', { name: snapshot.nombre })}
        </h1>
        <p className="mt-1 text-base text-[var(--color-text-secondary)]">
          {t('context.selector.subtitle')}
        </p>
      </div>

      {generalError ? (
        <div className="mb-6">
          <Alert variant="error">{generalError}</Alert>
        </div>
      ) : null}

      {/* Cuenta personal */}
      {personalOrg ? (
        <>
          <SectionLabel>{t('context.selector.personalSection')}</SectionLabel>
          <div className="mb-6">
            <OrgCard
              org={personalOrg}
              isActive={organizacionActiva?.id === personalOrg.id}
              isPersonal
              loading={contextSwitch.isPending}
              onSelect={() => handleSelect(personalOrg)}
            />
          </div>
        </>
      ) : null}

      {/* Organizaciones empresa */}
      {empresaOrgs.length > 0 ? (
        <>
          <SectionLabel>{t('context.selector.orgsSection')}</SectionLabel>
          <div className="flex flex-col gap-3">
            {empresaOrgs.map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                isActive={organizacionActiva?.id === org.id}
                loading={contextSwitch.isPending}
                onSelect={() => handleSelect(org)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

// --- Sub-componentes ---

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
      {children}
    </p>
  )
}

function OrgCard({
  org,
  isActive,
  isPersonal,
  loading,
  onSelect,
}: {
  org: OrganizacionDisponible
  isActive: boolean
  isPersonal?: boolean
  loading: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      className={`
        flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all
        focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-cyan)]
        disabled:cursor-wait disabled:opacity-70
        ${isActive
          ? 'border-[var(--color-brand-cyan)] bg-[var(--color-brand-cyan)]/5'
          : 'border-[var(--color-surface-3)] bg-[var(--color-surface-1)] hover:border-[var(--color-text-tertiary)]'
        }
      `}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
        {isPersonal ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {isPersonal ? t('context.selector.personalName') : org.nombre}
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          {isPersonal
            ? t('context.selector.personalDesc')
            : `${org.rol} · ${org.tipoOrganizacion}`}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" />
    </button>
  )
}
