import { useTranslation } from 'react-i18next'
import { TracAutoMark } from '@/shared/ui/legacy/TracAutoMark'

export function LandingFooter() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-[var(--border-color)] pb-8 pt-16">
      <div className="mx-auto max-w-[1200px] px-6">
      <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <FooterBrand />
        <FooterColumn title={t('landing.footer.product.title')} links={[
            { label: t('landing.footer.product.features'), href: '#funcionalidades' },
            { label: t('landing.footer.product.plans'), href: '#planes' },
            { label: t('landing.footer.product.integrations'), href: '#' },
            { label: t('landing.footer.product.api'), href: '#' },
          ]} />
          <FooterColumn title={t('landing.footer.company.title')} links={[
            { label: t('landing.footer.company.about'), href: '#' },
            { label: t('landing.footer.company.blog'), href: '#' },
            { label: t('landing.footer.company.contact'), href: '#contacto' },
            { label: t('landing.footer.company.careers'), href: '#' },
          ]} />
        <FooterColumn title={t('landing.footer.legal.title')} links={[
            { label: t('landing.footer.legal.terms'), href: '#' },
            { label: t('landing.footer.legal.privacy'), href: '#' },
            { label: t('landing.footer.legal.cookies'), href: '#' },
          ]} />
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--border-color)] pt-8 sm:flex-row">
          <p className="text-xs text-[var(--text-tertiary)]">{t('landing.footer.copyright')}</p>
          <SocialLinks />
        </div>
      </div>
    </footer>
  )
}

function FooterBrand() {
  const { t } = useTranslation()
  return (
    <div>
      <div className="mb-2"><TracAutoMark compact /></div>
      <p className="mt-4 max-w-[280px] text-sm leading-relaxed text-[var(--text-secondary)]">
        {t('landing.footer.brandDesc')}
      </p>
    </div>
  )
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-primary)]">{title}</h4>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          className="block rounded-md py-1 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
        >
          {l.label}
        </a>
      ))}
    </div>
  )
}

function SocialLinks() {
  return (
    <div className="flex gap-4">
      <a
        href="#"
        aria-label="Twitter"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
      </a>
      <a
        href="#"
        aria-label="LinkedIn"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
      </a>
      <a
        href="#"
        aria-label="Instagram"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
      </a>
    </div>
  )
}
