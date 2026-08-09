import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Alert } from '@/shared/ui/legacy/Alert'
import { Button } from '@/shared/ui/legacy/Button'

interface ErrorFallbackProps {
  error?: Error | null
  onReset: () => void
}

export function ErrorFallback({ onReset }: ErrorFallbackProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[200px] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <AlertTriangle
          className="mx-auto h-10 w-10 text-[var(--color-warning)]"
          aria-hidden="true"
        />

        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {t('errors.boundary.title')}
        </h2>

        <Alert variant="error">
          {t('errors.boundary.message')}
        </Alert>

        <Button variant="secondary" onClick={onReset}>
          {t('errors.boundary.retry')}
        </Button>
      </div>
    </div>
  )
}
