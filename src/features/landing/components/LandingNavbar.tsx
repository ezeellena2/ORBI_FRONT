import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { TracAutoMark } from '@/shared/ui/legacy/TracAutoMark'
import { LandingThemeSwitcher } from './LandingThemeSwitcher'

export function LandingNavbar() {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(function handleScroll() {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-[200] py-4 transition-all duration-300 ${
          scrolled
            ? 'border-b border-[var(--border-color)] bg-[var(--glass-bg)] backdrop-blur-[20px]'
            : ''
        }`}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6">
          <TracAutoMark compact />
          <NavLinks />
          <NavActions />
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t('landing.nav.menu')}
          >
            <Menu className="h-5 w-5 text-[var(--text-primary)]" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center gap-8 bg-[var(--overlay)] backdrop-blur-[20px]">
          <button
            className="absolute right-6 top-5 flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
            onClick={() => setMobileOpen(false)}
            aria-label={t('landing.nav.close')}
          >
            <X className="h-7 w-7" />
          </button>
          <MobileLinks onClose={() => setMobileOpen(false)} />
        </div>
      ) : null}
    </>
  )
}

function NavLinks() {
  const { t } = useTranslation()
  return (
    <div className="hidden items-center gap-8 md:flex">
      <a href="#funcionalidades" className="rounded-md px-1 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]">
        {t('landing.nav.features')}
      </a>
      <a href="#planes" className="rounded-md px-1 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]">
        {t('landing.nav.plans')}
      </a>
      <a href="#contacto" className="rounded-md px-1 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]">
        {t('landing.nav.contact')}
      </a>
    </div>
  )
}

function NavActions() {
  const { t } = useTranslation()
  return (
    <div className="hidden items-center gap-3 md:flex">
      <LandingThemeSwitcher />
      <Link to="/auth/login" className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]">
        {t('landing.nav.login')}
      </Link>
      <Link to="/auth/registro" className="rounded-lg bg-[var(--amber)] px-4 py-2 text-sm font-semibold text-[var(--amber-text)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]">
        {t('landing.nav.cta')}
      </Link>
    </div>
  )
}

function MobileLinks({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <a href="#funcionalidades" onClick={onClose} className="rounded-md px-2 py-2 text-2xl font-semibold text-[var(--text-primary)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]">
        {t('landing.nav.features')}
      </a>
      <a href="#planes" onClick={onClose} className="rounded-md px-2 py-2 text-2xl font-semibold text-[var(--text-primary)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]">
        {t('landing.nav.plans')}
      </a>
      <a href="#contacto" onClick={onClose} className="rounded-md px-2 py-2 text-2xl font-semibold text-[var(--text-primary)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]">
        {t('landing.nav.contact')}
      </a>
      <Link to="/auth/login" onClick={onClose} className="rounded-md px-2 py-2 text-2xl font-semibold text-[var(--text-primary)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]">
        {t('landing.nav.login')}
      </Link>
      <Link to="/auth/registro" onClick={onClose} className="rounded-xl bg-[var(--amber)] px-6 py-3 text-sm font-semibold text-[var(--amber-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]">
        {t('landing.nav.cta')}
      </Link>
    </>
  )
}
