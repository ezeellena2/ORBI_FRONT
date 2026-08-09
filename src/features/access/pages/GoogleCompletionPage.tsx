import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  googleCompletionSchema,
  type GoogleCompletionFormData,
} from '../schemas/google-completion-schema'
import { useGoogleCompleteRegistration } from '../hooks/useGoogleCompleteRegistration'
import { useGooglePendingRegistration } from '../hooks/useGooglePendingRegistration'
import {
  hasApiFieldErrors,
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import { Input } from '@/shared/ui/legacy/Input'
import { Select } from '@/shared/ui/legacy/Select'
import { Button } from '@/shared/ui/legacy/Button'
import { Alert } from '@/shared/ui/legacy/Alert'
import { PasswordStrength } from '@/shared/ui/legacy/PasswordStrength'
import { resolveDocumentInputMode } from '@/shared/utils/document-input'
import type { GooglePrefill } from '@/services/contracts/auth'

const TOTAL_STEPS = 3

/**
 * Pagina de completar registro federado (Google Sign-In).
 * El usuario llega aca despues de un exchange con outcome requires_profile_completion.
 * Recupera el registrationTicket desde la URL y el prefill desde backend.
 * Pasos: 1-Documento, 2-Password, 3-Exito (via navegacion a /app).
 */
export function GoogleCompletionPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const registrationTicket = searchParams.get('ticket')?.trim() ?? ''
  const pendingRegistrationQuery = useGooglePendingRegistration(
    registrationTicket || null,
  )

  if (!registrationTicket) {
    return <Navigate to="/auth/login" replace />
  }

  if (pendingRegistrationQuery.isLoading) {
    return (
      <div className="rounded-2xl bg-[var(--color-surface-1)] p-8">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t('common.loading')}
        </p>
      </div>
    )
  }

  if (pendingRegistrationQuery.error) {
    const apiError = parseApiError(pendingRegistrationQuery.error)
    return (
      <div className="rounded-2xl bg-[var(--color-surface-1)] p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          {t('auth.googleCompletion.title')}
        </h1>
        <div className="mt-4">
          <Alert variant="error">{resolveApiErrorMessage(apiError, t)}</Alert>
        </div>
        <div className="mt-6">
          <Link
            to="/auth/login"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-surface-3)] px-6 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
          >
            {t('auth.googleCompletion.back')}
          </Link>
        </div>
      </div>
    )
  }

  const pendingRegistration = pendingRegistrationQuery.data?.data
  if (!pendingRegistration) {
    return <Navigate to="/auth/login" replace />
  }

  return (
    <GoogleCompletionForm
      registrationTicket={pendingRegistration.registrationTicket}
      prefill={pendingRegistration.prefill}
      currentStep={currentStep}
      setCurrentStep={setCurrentStep}
      t={t}
    />
  )
}

function GoogleCompletionForm({
  registrationTicket,
  prefill,
  currentStep,
  setCurrentStep,
  t,
}: {
  registrationTicket: string
  prefill: GooglePrefill
  currentStep: number
  setCurrentStep: (step: number) => void
  t: (key: string) => string
}) {
  const form = useForm<GoogleCompletionFormData>({
    resolver: zodResolver(googleCompletionSchema),
    defaultValues: {
      tipoDocumento: 'dni',
      numeroDocumento: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const completionMutation = useGoogleCompleteRegistration()
  const documentType = useWatch({ control: form.control, name: 'tipoDocumento' })

  const generalError = (() => {
    if (!completionMutation.error) return null
    const apiError = parseApiError(completionMutation.error)
    if (hasApiFieldErrors(apiError)) return null
    return resolveApiErrorMessage(apiError, t)
  })()

  const docTypeOptions = [
    { value: 'dni', label: t('auth.registro.docTypes.dni') },
    { value: 'cuit', label: t('auth.registro.docTypes.cuit') },
    { value: 'pasaporte', label: t('auth.registro.docTypes.passport') },
    { value: 'otro', label: t('auth.registro.docTypes.other') },
  ]

  async function validateAndAdvance(
    fields: (keyof GoogleCompletionFormData)[],
    nextStep: number,
  ) {
    const valid = await form.trigger(fields)
    if (valid) setCurrentStep(nextStep)
  }

  function handleSubmit() {
    form.handleSubmit((data) => {
      completionMutation.mutate(
        {
          registrationTicket,
          tipoDocumento: data.tipoDocumento,
          numeroDocumento: data.numeroDocumento,
          password: data.password,
        },
        {
          onError: (error) => {
            const apiError = parseApiError(error)
            const fieldErrors = resolveApiFieldErrors(apiError, t)
            if (Object.keys(fieldErrors).length > 0) {
              Object.entries(fieldErrors).forEach(([field, message]) => {
                const key = field as keyof GoogleCompletionFormData
                form.setError(key, { message })
              })
              const fieldStepMap: Record<string, number> = {
                tipoDocumento: 1,
                numeroDocumento: 1,
                password: 2,
              }
              const firstField = Object.keys(fieldErrors)[0]
              if (firstField && fieldStepMap[firstField]) {
                setCurrentStep(fieldStepMap[firstField])
              }
            }
          },
        },
      )
    })()
  }

  const passwordValue = useWatch({ control: form.control, name: 'password' })

  return (
    <div className="rounded-2xl bg-[var(--color-surface-1)] p-8">
      <StepProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {/* Prefill info de Google */}
      <div className="mb-6 rounded-xl border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
          {t('auth.googleCompletion.prefillInfo')}
        </p>
        <p className="text-sm text-[var(--color-text-primary)]">
          {[prefill.nombre, prefill.apellido].filter(Boolean).join(' ')}
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {prefill.email}
        </p>
      </div>

      {generalError ? (
        <div className="mb-6">
          <Alert variant="error">{generalError}</Alert>
        </div>
      ) : null}

      {/* Step 1: Documento */}
      {currentStep === 1 ? (
        <StepContainer
          title={t('auth.googleCompletion.docStep.title')}
          subtitle={t('auth.googleCompletion.docStep.subtitle')}
        >
          <div className="grid grid-cols-[140px_1fr] gap-4 max-[480px]:grid-cols-1">
            <Select
              label={t('auth.registro.docTypeLabel')}
              options={docTypeOptions}
              error={
                form.formState.errors.tipoDocumento?.message
                  ? t(form.formState.errors.tipoDocumento.message)
                  : undefined
              }
              {...form.register('tipoDocumento')}
            />
            <Input
              label={t('auth.registro.docNumberLabel')}
              type="text"
              placeholder={t('auth.registro.examples.docNumber')}
              className="font-mono"
              autoComplete="off"
              inputMode={resolveDocumentInputMode(documentType)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              error={
                form.formState.errors.numeroDocumento?.message
                  ? t(form.formState.errors.numeroDocumento.message)
                  : undefined
              }
              {...form.register('numeroDocumento')}
            />
          </div>
          <StepNav>
            <Link
              to="/auth/login"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-surface-3)] px-6 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
            >
              {t('auth.googleCompletion.back')}
            </Link>
            <Button
              onClick={() =>
                validateAndAdvance(['tipoDocumento', 'numeroDocumento'], 2)
              }
            >
              {t('auth.googleCompletion.continue')}
            </Button>
          </StepNav>
        </StepContainer>
      ) : null}

      {/* Step 2: Password */}
      {currentStep === 2 ? (
        <StepContainer
          title={t('auth.googleCompletion.passwordStep.title')}
          subtitle={t('auth.googleCompletion.passwordStep.subtitle')}
        >
          <Input
            label={t('auth.registro.passwordLabel')}
            type="password"
            placeholder={t('auth.registro.passwordPlaceholder')}
            autoComplete="new-password"
            error={
              form.formState.errors.password?.message
                ? t(form.formState.errors.password.message)
                : undefined
            }
            {...form.register('password')}
          />
          <PasswordStrength password={passwordValue} />
          <Input
            label={t('auth.registro.confirmPasswordLabel')}
            type="password"
            placeholder={t('auth.registro.confirmPasswordPlaceholder')}
            autoComplete="new-password"
            error={
              form.formState.errors.confirmPassword?.message
                ? t(form.formState.errors.confirmPassword.message)
                : undefined
            }
            {...form.register('confirmPassword')}
          />
          <StepNav>
            <Button variant="secondary" onClick={() => setCurrentStep(1)}>
              {t('auth.googleCompletion.back')}
            </Button>
            <Button
              onClick={handleSubmit}
              loading={completionMutation.isPending}
            >
              {completionMutation.isPending
                ? t('common.loading')
                : t('auth.googleCompletion.submit')}
            </Button>
          </StepNav>
        </StepContainer>
      ) : null}
    </div>
  )
}

// --- Sub-componentes internos ---

function StepProgress({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) {
  return (
    <div className="mb-6 flex gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
            i < currentStep
              ? 'bg-[var(--color-brand-amber)]'
              : 'bg-[var(--color-surface-3)]'
          }`}
        />
      ))}
    </div>
  )
}

function StepContainer({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-[var(--color-text-secondary)]">
          {subtitle}
        </p>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  )
}

function StepNav({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 flex gap-3">{children}</div>
}
