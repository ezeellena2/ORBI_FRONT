import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import {
  restablecerPasswordSchema,
  type RestablecerPasswordFormData,
} from '../schemas/restablecer-password-schema'
import { useRestablecerPassword } from '../hooks/useRestablecerPassword'
import {
  hasApiFieldErrors,
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import { Input } from '@/shared/ui/legacy/Input'
import { Button } from '@/shared/ui/legacy/Button'
import { Alert } from '@/shared/ui/legacy/Alert'
import { PasswordStrength } from '@/shared/ui/legacy/PasswordStrength'

export function RestablecerPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [showSuccess, setShowSuccess] = useState(false)
  const mutation = useRestablecerPassword()

  const form = useForm<RestablecerPasswordFormData>({
    resolver: zodResolver(restablecerPasswordSchema),
    defaultValues: {
      token,
      nuevaPassword: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const passwordValue = useWatch({ control: form.control, name: 'nuevaPassword' })

  const generalError = (() => {
    if (!mutation.error) return null
    const apiError = parseApiError(mutation.error)
    if (hasApiFieldErrors(apiError)) return null
    return resolveApiErrorMessage(apiError, t)
  })()

  const onSubmit = (data: RestablecerPasswordFormData) => {
    mutation.mutate(
      {
        token: data.token,
        nuevaPassword: data.nuevaPassword,
      },
      {
        onSuccess: () => {
          setShowSuccess(true)
        },
        onError: (error) => {
          const apiError = parseApiError(error)
          const fieldErrors = resolveApiFieldErrors(apiError, t)
          if (Object.keys(fieldErrors).length > 0) {
            Object.entries(fieldErrors).forEach(([field, message]) => {
              form.setError(field as keyof RestablecerPasswordFormData, { message })
            })
          }
        },
      },
    )
  }

  if (showSuccess) {
    return (
      <div className="rounded-2xl bg-[var(--color-surface-1)] p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-cyan)]/10">
          <CheckCircle className="h-8 w-8 text-[var(--color-brand-cyan)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {t('auth.passwordReset.success.title')}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          {t('auth.passwordReset.success.subtitle')}
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
          {t('auth.passwordReset.success.sessionsHint')}
        </p>
        <Link
          to="/auth/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-brand-amber)] px-4 py-3 text-sm font-semibold text-[var(--color-bg-canvas)] transition-opacity hover:opacity-90"
        >
          {t('auth.passwordReset.success.loginCta')}
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[var(--color-surface-1)] p-8">
      <div className="mb-1 text-xs uppercase tracking-[0.24em] text-[var(--color-text-tertiary)]">
        {t('auth.passwordReset.eyebrow')}
      </div>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
        {t('auth.passwordReset.title')}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        {t('auth.passwordReset.subtitle')}
      </p>

      {!token ? (
        <div className="mt-6">
          <Alert variant="error">{t('auth.passwordReset.tokenMissing')}</Alert>
          <Link
            to="/auth/recuperar-password"
            className="mt-4 inline-flex text-sm font-medium text-[var(--color-brand-cyan)] hover:underline"
          >
            {t('auth.passwordReset.requestAnotherLink')}
          </Link>
        </div>
      ) : (
        <>
          {generalError ? (
            <div className="mt-4">
              <Alert variant="error">{generalError}</Alert>
            </div>
          ) : null}

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
            <Input
              label={t('auth.passwordReset.newPasswordLabel')}
              type="password"
              placeholder={t('auth.passwordReset.newPasswordPlaceholder')}
              autoComplete="new-password"
              error={form.formState.errors.nuevaPassword?.message
                ? t(form.formState.errors.nuevaPassword.message)
                : undefined}
              {...form.register('nuevaPassword')}
            />

            <PasswordStrength password={passwordValue} />

            <Input
              label={t('auth.passwordReset.confirmPasswordLabel')}
              type="password"
              placeholder={t('auth.passwordReset.confirmPasswordPlaceholder')}
              autoComplete="new-password"
              error={form.formState.errors.confirmPassword?.message
                ? t(form.formState.errors.confirmPassword.message)
                : undefined}
              {...form.register('confirmPassword')}
            />

            <p className="text-xs text-[var(--color-text-tertiary)]">
              {t('auth.passwordReset.expirationHint')}
            </p>

            <Button type="submit" loading={mutation.isPending}>
              {mutation.isPending ? t('common.loading') : t('auth.passwordReset.submit')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
            <Link
              to="/auth/login"
              className="font-medium text-[var(--color-brand-cyan)] hover:underline"
            >
              {t('auth.passwordReset.backToLogin')}
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
