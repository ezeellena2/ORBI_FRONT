import { useTranslation } from 'react-i18next'

interface PasswordStrengthProps {
  password: string
}

function getStrengthScore(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

const strengthColors: Record<number, string> = {
  1: 'bg-[var(--color-danger)]',
  2: 'bg-[var(--color-danger)]',
  3: 'bg-[var(--color-brand-amber)]',
  4: 'bg-[var(--color-brand-amber)]',
  5: 'bg-[var(--color-success)]',
}

const strengthTextColors: Record<number, string> = {
  1: 'text-[var(--color-danger)]',
  2: 'text-[var(--color-danger)]',
  3: 'text-[var(--color-brand-amber)]',
  4: 'text-[var(--color-brand-amber)]',
  5: 'text-[var(--color-success)]',
}

/**
 * Indicador visual de fuerza de contraseña con 4 segmentos.
 * Evalua: largo >= 8, mayuscula, digito, caracter especial.
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { t } = useTranslation()
  const score = password.length > 0 ? getStrengthScore(password) : 0

  const labelKeys: Record<number, string> = {
    0: 'auth.registro.password.strengthEmpty',
    1: 'auth.registro.password.strengthWeak',
    2: 'auth.registro.password.strengthWeak',
    3: 'auth.registro.password.strengthFair',
    4: 'auth.registro.password.strengthGood',
    5: 'auth.registro.password.strengthExcellent',
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((segment) => (
          <div
            key={segment}
            className={`h-1 flex-1 rounded-full transition-colors ${
              segment <= score
                ? strengthColors[score]
                : 'bg-[var(--color-surface-3)]'
            }`}
          />
        ))}
      </div>
      <p
        className={`text-xs ${
          score > 0
            ? strengthTextColors[score]
            : 'text-[var(--color-text-tertiary)]'
        }`}
      >
        {t(labelKeys[score])}
      </p>
    </div>
  )
}
