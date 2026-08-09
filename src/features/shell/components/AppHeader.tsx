import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Bell, LogOut, ArrowLeftRight } from 'lucide-react'
import { useSessionStore } from '@/stores/session-store'
import { useLogout } from '@/features/access/hooks/useLogout'
import { ThemeSwitcher } from '@/shared/ui/legacy/ThemeSwitcher'
import { useClickOutside } from '@/shared/hooks/useClickOutside'
import { useBreadcrumb } from '../hooks/useBreadcrumb'
import { cn } from '@/shared/utils/cn'

function Breadcrumb() {
  const { t } = useTranslation()
  const crumbs = useBreadcrumb()

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={crumb.labelKey} className="flex items-center gap-1.5">
          {i > 0 ? <span className="text-text-tertiary">/</span> : null}
          <span className={cn('text-text-secondary', i === crumbs.length - 1 && 'font-medium text-text-primary')}>
            {t(crumb.labelKey)}
          </span>
        </span>
      ))}
    </nav>
  )
}

interface AvatarMenuProps {
  nombre: string
  apellido: string
  email: string
  rol: string
  onClose: () => void
  onLogout: () => void
  isPending: boolean
}

function AvatarMenuContent({ nombre, apellido, email, rol, onClose, onLogout, isPending }: AvatarMenuProps) {
  const { t } = useTranslation()
  return (
    <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border-subtle bg-surface-secondary shadow-lg">
      <div className="border-b border-border-subtle px-4 py-3">
        <p className="text-sm font-medium text-text-primary">{nombre} {apellido}</p>
        <p className="truncate text-xs text-text-tertiary">{email}</p>
        <span className="mt-1 inline-block rounded-md bg-brand-cyan/10 px-2 py-0.5 text-xs font-medium text-brand-cyan">{rol}</span>
      </div>
      <div className="py-1">
        <Link
          to="/app/selector"
          onClick={onClose}
          role="menuitem"
          className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary"
        >
          <ArrowLeftRight className="h-4 w-4" />
          {t('shell.header.changeContext')}
        </Link>
      </div>
      <div className="border-t border-border-subtle py-1">
        <button
          type="button"
          role="menuitem"
          onClick={onLogout}
          disabled={isPending}
          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-danger disabled:cursor-wait disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {t('shell.header.logout')}
        </button>
      </div>
    </div>
  )
}

function AvatarDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nombre = useSessionStore(s => s.snapshot?.nombre ?? '')
  const apellido = useSessionStore(s => s.snapshot?.apellido ?? '')
  const email = useSessionStore(s => s.snapshot?.email ?? '')
  const rol = useSessionStore(s => s.organizacionActiva?.rol ?? '')
  const logoutMutation = useLogout()

  useClickOutside(ref, () => setOpen(false))

  const initials = ((nombre[0] ?? '') + (apellido[0] ?? '')).toUpperCase()

  function handleLogout() {
    setOpen(false)
    logoutMutation.mutate()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${nombre} ${apellido}`}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-tertiary text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
      >
        {initials}
      </button>
      {open ? (
        <AvatarMenuContent
          nombre={nombre}
          apellido={apellido}
          email={email}
          rol={rol}
          onClose={() => setOpen(false)}
          onLogout={handleLogout}
          isPending={logoutMutation.isPending}
        />
      ) : null}
    </div>
  )
}

export function AppHeader() {
  const { t } = useTranslation()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle bg-surface-primary px-6">
      <Breadcrumb />
      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        <button
          type="button"
          aria-label={t('shell.header.notifications')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary"
        >
          <Bell className="h-4 w-4" />
        </button>
        <AvatarDropdown />
      </div>
    </header>
  )
}
