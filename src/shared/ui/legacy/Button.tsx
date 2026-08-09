import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonVariant = 'primary' | 'secondary'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-brand-amber)] text-[var(--color-bg-canvas)] font-semibold hover:opacity-90',
  secondary:
    'border border-[var(--color-surface-3)] text-[var(--color-text-primary)] font-medium hover:bg-[var(--color-surface-1)]',
}

/**
 * Boton con variantes. Touch target minimo 44px (py-3).
 * Muestra loading state con opacity reducida y cursor wait.
 */
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={`
        w-full rounded-xl px-4 py-3 text-sm transition-all
        focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-cyan)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-canvas)]
        disabled:cursor-not-allowed disabled:opacity-50
        ${loading ? 'cursor-wait opacity-70' : ''}
        ${variantClasses[variant]}
      `}
      disabled={disabled ?? loading}
      {...props}
    >
      {children}
    </button>
  )
}
