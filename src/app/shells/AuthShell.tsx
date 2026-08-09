import { Outlet } from 'react-router-dom'
import { TracAutoMark } from '@/shared/ui/legacy/TracAutoMark'
import { ThemeSwitcher } from '@/shared/ui/legacy/ThemeSwitcher'

/**
 * Shell publico para pantallas de auth (login, registro, invitacion).
 * Envuelto por PublicOnlyRoute — si ya esta autenticado, redirige a /app.
 * Layout minimo: logo + contenido centrado + theme toggle.
 */
export function AuthShell() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-canvas)] px-4">
      <div className="absolute right-4 top-4">
        <ThemeSwitcher />
      </div>
      <div className="mb-8">
        <TracAutoMark />
      </div>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}

