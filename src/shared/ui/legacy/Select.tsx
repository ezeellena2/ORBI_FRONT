import type { SelectHTMLAttributes, Ref } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: SelectOption[]
  ref?: Ref<HTMLSelectElement>
}

/**
 * Select con label visible (accesibilidad) y mensaje de error.
 * Contraste 4.5:1, focus ring visible.
 */
export function Select({ label, error, options, id, ref, ...props }: SelectProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className="text-sm font-medium text-[var(--color-text-secondary)]"
      >
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        className={`
          w-full appearance-none rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-4 py-3
          text-sm text-[var(--color-text-primary)]
          outline-none transition-shadow
          focus:border-[var(--color-brand-cyan)] focus:ring-2 focus:ring-[var(--color-brand-cyan)]
          ${error ? 'border-[var(--color-danger)] ring-2 ring-[var(--color-danger)]' : ''}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs text-[var(--color-danger)]">{error}</p>
      ) : null}
    </div>
  )
}
