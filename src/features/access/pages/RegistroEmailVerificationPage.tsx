import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '@/stores/session-store'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Alert } from '@/shared/ui/legacy/Alert'
import { Button } from '@/shared/ui/legacy/Button'
import { Input } from '@/shared/ui/legacy/Input'
import {
  registroEmailVerificationSchema,
  type RegistroEmailVerificationFormData,
} from '../schemas/registro-email-verification-schema'
import { useRegistroPendiente } from '../hooks/useRegistroPendiente'
import { useReenviarCodigoRegistro } from '../hooks/useReenviarCodigoRegistro'
import { useVerificarCodigoRegistro } from '../hooks/useVerificarCodigoRegistro'

export function RegistroEmailVerificationPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const login = useSessionStore((s) => s.login)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [clockMs, setClockMs] = useState(() => Date.now())
  const verificationTicket = searchParams.get('ticket')?.trim() ?? ''

  const pendingQuery = useRegistroPendiente(verificationTicket || null)
  const reenviarMutation = useReenviarCodigoRegistro()
  const verificarMutation = useVerificarCodigoRegistro()

  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const form = useForm<RegistroEmailVerificationFormData>({
    resolver: zodResolver(registroEmailVerificationSchema),
    defaultValues: { codigo: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  if (!verificationTicket) {
    return <Navigate to="/auth/login" replace />
  }

  if (pendingQuery.isLoading) {
    return (
      <div className="rounded-2xl bg-[var(--color-surface-1)] p-8">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t('common.loading')}
        </p>
      </div>
    )
  }

  if (pendingQuery.error) {
    const apiError = parseApiError(pendingQuery.error)
    return (
      <div className="rounded-2xl bg-[var(--color-surface-1)] p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          {t('auth.emailVerification.title')}
        </h1>
        <div className="mt-4">
          <Alert variant="error">{resolveApiErrorMessage(apiError, t)}</Alert>
        </div>
        <div className="mt-6">
          <Link
            to="/auth/login"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-surface-3)] px-6 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
          >
            {t('auth.emailVerification.backToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  const pendingData = pendingQuery.data?.data
  if (!pendingData) {
    return <Navigate to="/auth/login" replace />
  }

  const pending = pendingData

  const resendAvailableAtMs = pending.puedeReenviarEnUtc
    ? new Date(pending.puedeReenviarEnUtc).getTime()
    : 0

  const resendCountdown = Math.max(
    0,
    Math.ceil((resendAvailableAtMs - clockMs) / 1000),
  )

  const helperKey = pending.expirado
    ? 'auth.emailVerification.expiredHint'
    : 'auth.emailVerification.subtitle'

  const generalError = (() => {
    if (!verificarMutation.error) return null
    return resolveApiErrorMessage(parseApiError(verificarMutation.error), t)
  })()

  const resendError = (() => {
    if (!reenviarMutation.error) return null
    return resolveApiErrorMessage(parseApiError(reenviarMutation.error), t)
  })()

  const resendLabel = reenviarMutation.isPending
    ? t('common.loading')
    : resendCountdown > 0
      ? t('auth.emailVerification.resendCountdown', {
          seconds: resendCountdown,
        })
      : t('auth.emailVerification.resend')

  function handleVerify() {
    form.handleSubmit((data) => {
      setFeedback(null)
      verificarMutation.mutate(
        {
          verificationTicket: pending.verificationTicket,
          codigo: data.codigo.trim(),
        },
        {
          onSuccess: (response) => {
            login(response.data)
            navigate('/app', { replace: true })
          },
          onError: (error) => {
            const apiError = parseApiError(error)
            form.setError('codigo', {
              message: resolveApiErrorMessage(apiError, t),
            })
          },
        },
      )
    })()
  }

  function handleResend() {
    setFeedback(null)
    reenviarMutation.mutate(
      { verificationTicket: pending.verificationTicket },
      {
        onSuccess: async () => {
          form.reset({ codigo: '' })
          setFeedback(t('auth.emailVerification.resendSuccess'))
          await pendingQuery.refetch()
        },
      },
    )
  }

  return (
    <div className="rounded-2xl bg-[var(--color-surface-1)] p-8">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-text-tertiary)]">
          {t('auth.emailVerification.eyebrow')}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          {t('auth.emailVerification.title')}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-[var(--color-text-secondary)]">
          {t(helperKey, { email: pending.maskedEmail })}
        </p>
      </div>

      {feedback ? (
        <div className="mb-4">
          <Alert variant="success">{feedback}</Alert>
        </div>
      ) : null}

      {resendError ? (
        <div className="mb-4">
          <Alert variant="error">{resendError}</Alert>
        </div>
      ) : null}

      {generalError ? (
        <div className="mb-4">
          <Alert variant="error">{generalError}</Alert>
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] p-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t('auth.emailVerification.helper', { email: pending.maskedEmail })}
        </p>
      </div>

      <Input
        label={t('auth.emailVerification.codeLabel')}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder={t('auth.emailVerification.codePlaceholder')}
        error={form.formState.errors.codigo?.message
          ? t(form.formState.errors.codigo.message)
          : undefined}
        {...form.register('codigo')}
      />

      <p className="mt-3 text-sm text-[var(--color-text-tertiary)]">
        {t('auth.emailVerification.expirationHint')}
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Button
          onClick={handleVerify}
          loading={verificarMutation.isPending}
        >
          {verificarMutation.isPending
            ? t('common.loading')
            : t('auth.emailVerification.submit')}
        </Button>

        <Button
          variant="secondary"
          onClick={handleResend}
          disabled={reenviarMutation.isPending || resendCountdown > 0}
        >
          {resendLabel}
        </Button>
      </div>

      <div className="mt-6">
        <Link
          to="/auth/login"
          className="text-sm font-medium text-[var(--color-brand-cyan)] hover:underline"
        >
          {t('auth.emailVerification.backToLogin')}
        </Link>
      </div>
    </div>
  )
}
