import { Layers3, Languages, ShieldCheck, Waypoints } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { appConfig } from '@/config/env'
import { TracAutoMark } from '@/shared/ui/legacy/TracAutoMark'

const structureKeys = [
  'app',
  'features',
  'services',
  'stores',
  'modules',
  'shared',
] as const

const capabilityIcons = {
  session: ShieldCheck,
  context: Waypoints,
  i18n: Languages,
  layers: Layers3,
} as const

export function AppBootstrap() {
  const { t, i18n } = useTranslation()

  const capabilityKeys = [
    'session',
    'context',
    'i18n',
    'layers',
  ] as const

  return (
    <main className="page-shell">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.35fr)_380px]">
          <section className="glass-panel rounded-[1.75rem] p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <TracAutoMark />

                  <div className="status-chip text-xs font-medium">
                    <span className="status-dot" />
                    <span>{t('bootstrap.status')}</span>
                  </div>
                </div>

                <div className="max-w-3xl space-y-4">
                  <div className="section-eyebrow">{t('bootstrap.eyebrow')}</div>
                  <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.05em] text-text-primary sm:text-5xl">
                    {t('bootstrap.title')}
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">
                    {t('bootstrap.description')}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {capabilityKeys.map((key) => {
                  const Icon = capabilityIcons[key]

                  return (
                    <article
                      key={key}
                      className="rounded-[1.25rem] border border-border-subtle bg-surface-secondary/70 p-5"
                    >
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-cyan/10 text-brand-cyan">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="mb-2 text-lg font-semibold tracking-[-0.03em] text-text-primary">
                        {t(`bootstrap.capabilities.${key}.title`)}
                      </h2>
                      <p className="text-sm leading-6 text-text-secondary">
                        {t(`bootstrap.capabilities.${key}.body`)}
                      </p>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>

          <aside className="glass-panel rounded-[1.75rem] p-6 sm:p-8">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="section-eyebrow">{t('bootstrap.sidebarEyebrow')}</div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                    {t('bootstrap.sidebarTitle')}
                  </h2>
                  <p className="text-sm leading-6 text-text-secondary">
                    {t('bootstrap.sidebarDescription')}
                  </p>
                </div>
              </div>

              <dl className="space-y-4">
                <div className="rounded-[1.125rem] border border-border-subtle bg-surface-secondary/70 p-4">
                  <dt className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    {t('bootstrap.sidebar.baseUrl.label')}
                  </dt>
                  <dd className="font-mono text-sm text-text-primary">
                    {appConfig.accessApiBaseUrl}
                  </dd>
                </div>

                <div className="rounded-[1.125rem] border border-border-subtle bg-surface-secondary/70 p-4">
                  <dt className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    {t('bootstrap.sidebar.locale.label')}
                  </dt>
                  <dd className="font-mono text-sm text-text-primary">
                    {i18n.resolvedLanguage ?? appConfig.defaultLocale}
                  </dd>
                </div>

                <div className="rounded-[1.125rem] border border-border-subtle bg-surface-secondary/70 p-4">
                  <dt className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    {t('bootstrap.sidebar.runtime.label')}
                  </dt>
                  <dd className="font-mono text-sm text-text-primary">
                    {appConfig.runtimeEnvironment}
                  </dd>
                </div>
              </dl>

              <section className="rounded-[1.25rem] border border-border-subtle bg-surface-primary/75 p-5">
                <h2 className="mb-4 text-lg font-semibold tracking-[-0.03em] text-text-primary">
                  {t('bootstrap.structure.title')}
                </h2>

                <ul className="space-y-3">
                  {structureKeys.map((key) => (
                    <li
                      key={key}
                      className="flex items-start gap-3 rounded-2xl border border-border-subtle/60 bg-surface-secondary/70 px-4 py-3"
                    >
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-amber shadow-[0_0_16px_rgba(245,158,11,0.55)]" />
                      <div className="min-w-0">
                        <div className="font-mono text-xs uppercase tracking-[0.22em] text-brand-cyan">
                          {key}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-text-secondary">
                          {t(`bootstrap.structure.${key}`)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
