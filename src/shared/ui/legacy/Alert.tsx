import type { PropsWithChildren } from 'react'

type AlertVariant = 'error' | 'success' | 'info'

const variantClasses: Record<AlertVariant, string> = {
  error: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20',
  success: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20',
  info: 'bg-[var(--color-brand-cyan)]/10 text-[var(--color-brand-cyan)] border-[var(--color-brand-cyan)]/20',
}

interface AlertProps {
  variant?: AlertVariant
}

/**
 * Alerta para mensajes de error, exito o informacion.
 */
export function Alert({ variant = 'error', children }: PropsWithChildren<AlertProps>) {
  return (
    <div
      role="alert"
      className={`rounded-xl border px-4 py-3 text-sm ${variantClasses[variant]}`}
    >
      {children}
    </div>
  )
}
