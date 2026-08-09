import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle } from 'lucide-react'
import {
  solicitarRecuperacionPasswordSchema,
  type SolicitarRecuperacionPasswordFormData,
} from '../schemas/solicitar-recuperacion-schema'
import { useSolicitarRecuperacionPassword } from '../hooks/useSolicitarRecuperacionPassword'
import {
  hasApiFieldErrors,
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import { Input } from '@/shared/ui/legacy/Input'
import { Button } from '@/shared/ui/legacy/Button'
import { Alert } from '@/shared/ui/legacy/Alert'

export function SolicitarRecuperacionPage() {
  const { t } = useTranslation()
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const mutation = useSolicitarRecuperacionPassword()

  const form = useForm<SolicitarRecuperacionPasswordFormData>({
    resolver: zodResolver(solicitarRecuperacionPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const generalError = (() => {
    if (!mutation.error) return null
    const apiError = parseApiError(mutation.error)
    if (hasApiFieldErrors(apiError)) return null
    return resolveApiErrorMessage(apiError, t)
  })()

  const onSubmit = (data: SolicitarRecuperacionPasswordFormData) => {
    mutation.mutate(data, {
      onSuccess: () => {
        setSubmittedEmail(data.email.trim())
      },
      onError: (error) => {
        const apiError = parseApiError(error)
        const fieldErrors = resolveApiFieldErrors(apiError, t)
        if (Object.keys(fieldErrors).length > 0) {
          Object.entries(fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof SolicitarRecuperacionPasswordFormData, { message })
          })
        }
      },
    })
  }

  if (submittedEmail) {
    return (
      <div className="rounded-2xl bg-[var(--color-surface-1)] p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-cyan)]/10">
          <CheckCircle className="h-8 w-8 text-[var(--color-brand-cyan)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {t('auth.passwordRecovery.success.title')}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          {t('auth.passwordRecovery.success.subtitle', { email: submittedEmail })}
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
          {t('auth.passwordRecovery.success.disclaimer')}
        </p>
        <Link
          to="/auth/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-[var(--color-surface-3)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-2)]"
        >
          {t('auth.passwordRecovery.success.backToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[var(--color-surface-1)] p-8">
      <div className="mb-1 text-xs uppercase tracking-[0.24em] text-[var(--color-text-tertiary)]">
        {t('auth.passwordRecovery.eyebrow')}
      </div>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
        {t('auth.passwordRecovery.title')}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        {t('auth.passwordRecovery.subtitle')}
      </p>

      {generalError ? (
        <div className="mt-4">
          <Alert variant="error">{generalError}</Alert>
        </div>
      ) : null}

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
        <Input
          label={t('auth.passwordRecovery.emailLabel')}
          type="email"
          placeholder={t('auth.passwordRecovery.emailPlaceholder')}
          autoComplete="email"
          leadingAdornment={<Mail className="h-4 w-4" />}
          error={form.formState.errors.email?.message
            ? t(form.formState.errors.email.message)
            : undefined}
          {...form.register('email')}
        />

        <p className="text-xs text-[var(--color-text-tertiary)]">
          {t('auth.passwordRecovery.helper')}
        </p>

        <Button type="submit" loading={mutation.isPending}>
          {mutation.isPending ? t('common.loading') : t('auth.passwordRecovery.submit')}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
        <Link
          to="/auth/login"
          className="font-medium text-[var(--color-brand-cyan)] hover:underline"
        >
          {t('auth.passwordRecovery.backToLogin')}
        </Link>
      </div>
    </div>
  )
}
