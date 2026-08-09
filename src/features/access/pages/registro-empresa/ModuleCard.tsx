import { Check } from 'lucide-react'

interface ModuleCardProps {
  icon: string
  name: string
  description: string
  selected: boolean
  onToggle: () => void
}

/**
 * Tarjeta seleccionable de modulo para el registro empresa.
 * Touch target 44px minimo. Focus ring visible.
 */
export function ModuleCard({ icon, name, description, selected, onToggle }: ModuleCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        relative flex flex-col items-start rounded-xl border p-4 text-left transition-all
        focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-cyan)]
        ${selected
          ? 'border-[var(--color-brand-cyan)] bg-[var(--color-brand-cyan)]/5'
          : 'border-[var(--color-surface-3)] bg-[var(--color-surface-1)] hover:border-[var(--color-text-tertiary)]'
        }
      `}
    >
      {selected ? (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand-cyan)]">
          <Check className="h-3 w-3 text-fg-sobre-color" />
        </div>
      ) : null}
      <span className="text-lg">{icon}</span>
      <span className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">{name}</span>
      <span className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{description}</span>
    </button>
  )
}
