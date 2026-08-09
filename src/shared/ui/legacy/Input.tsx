import { useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  leadingAdornment?: ReactNode
  ref?: Ref<HTMLInputElement>
}

/**
 * Input con label visible (accesibilidad) y mensaje de error.
 * Contraste 4.5:1, focus ring visible.
 */
export function Input({ label, error, id, leadingAdornment, ref, ...props }: InputProps) {
  const { t } = useTranslation()
  const inputId = id ?? label.toLowerCase().replace(/\s/g, '-')
  const { className, type, ...inputProps } = props
  const isPasswordField = type === 'password'
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const resolvedType = isPasswordField && isPasswordVisible
    ? 'text'
    : type
  const visibilityLabel = isPasswordVisible
    ? t('common.passwordVisibility.hide')
    : t('common.passwordVisibility.show')

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-[var(--color-text-secondary)]"
      >
        {label}
      </label>
      <div className="relative">
        {leadingAdornment ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--color-text-tertiary)]">
            {leadingAdornment}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          {...inputProps}
          type={resolvedType}
          className={`
            w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-4 py-3
            text-sm text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-tertiary)]
            outline-none transition-shadow
            focus:border-[var(--color-brand-cyan)] focus:ring-2 focus:ring-[var(--color-brand-cyan)]
            ${leadingAdornment ? 'pl-11' : ''}
            ${isPasswordField ? 'pr-12' : ''}
            ${error ? 'border-[var(--color-danger)] ring-2 ring-[var(--color-danger)]' : ''}
            ${className ?? ''}
          `}
        />
        {isPasswordField ? (
          <button
            type="button"
            aria-label={visibilityLabel}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible((current) => !current)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)] focus:outline-none focus-visible:text-[var(--color-text-primary)]"
          >
            {isPasswordVisible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-[var(--color-danger)]">{error}</p>
      ) : null}
    </div>
  )
}
