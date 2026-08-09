import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { loginSchema, type LoginFormData } from '../schemas/login-schema'
import { useLogin } from '../hooks/useLogin'
import { useGoogleExchange } from '../hooks/useGoogleExchange'
import {
  hasApiFieldErrors,
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import { Input } from '@/shared/ui/legacy/Input'
import { Button } from '@/shared/ui/legacy/Button'
import { Alert } from '@/shared/ui/legacy/Alert'
import { promptGoogleSignIn } from '@/services/adapters/google-identity'
import { appConfig } from '@/config/env'

/**
 * Pantalla de login basada en mockup login/index.html.
 * Patrones: React Hook Form + Zod + useLogin hook + parseApiError.
 */
export function LoginPage() {
  const { t } = useTranslation()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const loginMutation = useLogin()
  const googleExchangeMutation = useGoogleExchange()
  const [googleLoading, setGoogleLoading] = useState(false)

  // Derivar error general del estado de la mutation — sin useEffect ni useState
  const generalError = (() => {
    if (!loginMutation.error) return null
    const apiError = parseApiError(loginMutation.error)
    if (hasApiFieldErrors(apiError)) return null
    return resolveApiErrorMessage(apiError, t)
  })()

  // Error de Google exchange
  const googleError = (() => {
    if (googleExchangeMutation.error) {
      const apiError = parseApiError(googleExchangeMutation.error)
      return resolveApiErrorMessage(apiError, t)
    }
    // requires_account_link se comunica via mutation.data
    const data = googleExchangeMutation.data?.data
    const outcomeMessageKey = data?.message_key ?? data?.messageKey
    if (data?.outcome === 'requires_account_link' && outcomeMessageKey) {
      return t(outcomeMessageKey)
    }
    return null
  })()

  function handleGoogleSignIn() {
    if (!appConfig.googleClientId) return

    setGoogleLoading(true)
    promptGoogleSignIn(appConfig.googleClientId, (credential) => {
      setGoogleLoading(false)
      googleExchangeMutation.mutate({ credential })
    }).catch(() => {
      setGoogleLoading(false)
    })
  }

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data, {
      onError: (error) => {
        // Mapear errores de validacion del backend a campos del form
        const apiError = parseApiError(error)
        const fieldErrors = resolveApiFieldErrors(apiError, t)
        if (Object.keys(fieldErrors).length > 0) {
          Object.entries(fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof LoginFormData, {
              message,
            })
          })
        }
      },
    })
  }

  return (
    <div className="rounded-2xl bg-[var(--color-surface-1)] p-8">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
        {t('auth.login.title')}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        {t('auth.login.subtitle')}
      </p>

      {generalError ? (
        <div className="mt-4">
          <Alert variant="error">{generalError}</Alert>
        </div>
      ) : null}

      {googleError ? (
        <div className="mt-4">
          <Alert variant="info">{googleError}</Alert>
        </div>
      ) : null}

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
        <Input
          label={t('auth.login.emailLabel')}
          type="email"
          placeholder={t('auth.login.emailPlaceholder')}
          autoComplete="email"
          leadingAdornment={<Mail className="h-4 w-4" />}
          error={form.formState.errors.email?.message
            ? t(form.formState.errors.email.message)
            : undefined}
          {...form.register('email')}
        />

        <Input
          label={t('auth.login.passwordLabel')}
          type="password"
          placeholder={t('auth.login.passwordPlaceholder')}
          autoComplete="current-password"
          error={form.formState.errors.password?.message
            ? t(form.formState.errors.password.message)
            : undefined}
          {...form.register('password')}
        />

        <div className="text-right">
          <Link
            to="/auth/recuperar-password"
            className="text-xs font-medium text-[var(--color-brand-cyan)] hover:underline"
          >
            {t('auth.login.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" loading={loginMutation.isPending}>
          {loginMutation.isPending
            ? t('common.loading')
            : t('auth.login.submit')}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-surface-3)]" />
        <span className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-tertiary)]">
          {t('auth.login.socialDivider')}
        </span>
        <div className="h-px flex-1 bg-[var(--color-surface-3)]" />
      </div>

      <button
        type="button"
        disabled={googleLoading || googleExchangeMutation.isPending || !appConfig.googleClientId}
        onClick={handleGoogleSignIn}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-surface-3)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)] disabled:cursor-wait disabled:opacity-70"
      >
        <GoogleMark />
        {googleLoading || googleExchangeMutation.isPending
          ? t('auth.login.googleLoading')
          : t('auth.login.googleCta')}
      </button>

      <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
        {t('auth.login.noAccount')}{' '}
        <Link
          to="/auth/registro"
          className="font-medium text-[var(--color-brand-cyan)] hover:underline"
        >
          {t('auth.login.createAccount')}
        </Link>
      </div>

      <div className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">
        <Link
          to="/auth/registro-empresa"
          className="font-medium text-[var(--color-brand-cyan)] hover:underline"
        >
          {t('auth.login.registerCompany')}
        </Link>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
