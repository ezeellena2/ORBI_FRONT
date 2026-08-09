import { Sun, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePreferencesStore } from '@/stores/preferences-store'

/**
 * Toggle de tema claro/oscuro. Icono sol (dark activo) o luna (light activo).
 * Touch target 44x44px, focus ring visible, animacion con prefers-reduced-motion.
 */
export function ThemeSwitcher() {
  const { t } = useTranslation()
  const theme = usePreferencesStore((s) => s.theme)
  const setTheme = usePreferencesStore((s) => s.setTheme)

  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={t('common.theme.toggle')}
      title={theme === 'dark' ? t('common.theme.light') : t('common.theme.dark')}
      className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-brand-amber)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-canvas)]"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}
