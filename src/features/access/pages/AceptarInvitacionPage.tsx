import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import {
  invitacionLoginSchema,
  invitacionRegistroSchema,
  type InvitacionLoginFormData,
  type InvitacionRegistroFormData,
} from '../schemas/aceptar-invitacion-schema'
import { useAceptarInvitacion } from '../hooks/useAceptarInvitacion'
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

type InviteTab = 'login' | 'register'

/**
 * Pagina de aceptar invitacion alineada con mockup invitacion/index.html.
 * Dos tabs: usuario existente (login) y usuario nuevo (registro).
 * El token de invitacion se lee del query param ?token=xxx.
 */
export function AceptarInvitacionPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [activeTab, setActiveTab] = useState<InviteTab>('login')
  const [showSuccess, setShowSuccess] = useState(false)

  const mutation = useAceptarInvitacion()

  const generalError = (() => {
    if (!mutation.error) return null
    const apiError = parseApiError(mutation.error)
    if (hasApiFieldErrors(apiError)) return null
    return resolveApiErrorMessage(apiError, t)
  })()

  if (showSuccess) {
    return <InviteSuccess />
  }

  return (
    <div className="rounded-2xl bg-[var(--color-surface-1)] p-8">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
        {t('auth.invitacion.heading')}
      </h1>

      {!token ? (
        <div className="mt-4">
          <Alert variant="error">{t('auth.invitacion.noToken')}</Alert>
        </div>
      ) : (
        <>
          {generalError ? (
            <div className="mt-4">
              <Alert variant="error">{generalError}</Alert>
            </div>
          ) : null}

          {/* Tabs */}
          <div className="mt-6 flex border-b border-[var(--color-surface-3)]">
            <TabButton
              active={activeTab === 'login'}
              onClick={() => setActiveTab('login')}
            >
              {t('auth.invitacion.tabLogin')}
            </TabButton>
            <TabButton
              active={activeTab === 'register'}
              onClick={() => setActiveTab('register')}
            >
              {t('auth.invitacion.tabRegister')}
            </TabButton>
          </div>

          {activeTab === 'login' ? (
            <InviteLoginForm
              token={token}
              mutation={mutation}
              onSuccess={() => setShowSuccess(true)}
            />
          ) : (
            <InviteRegisterForm
              token={token}
              mutation={mutation}
              onSuccess={() => setShowSuccess(true)}
            />
          )}

          <p className="mt-6 text-center text-xs text-[var(--color-text-tertiary)]">
            {t('auth.invitacion.disclaimer')}
          </p>
        </>
      )}
    </div>
  )
}

// --- Tab Button ---

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 py-3 text-center text-sm font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-cyan)]
        ${active
          ? 'border-b-2 border-[var(--color-brand-cyan)] text-[var(--color-brand-cyan)]'
          : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
        }
      `}
    >
      {children}
    </button>
  )
}

// --- Login Tab ---

function InviteLoginForm({
  token,
  mutation,
  onSuccess,
}: {
  token: string
  mutation: ReturnType<typeof useAceptarInvitacion>
  onSuccess: () => void
}) {
  const { t } = useTranslation()

  const form = useForm<InvitacionLoginFormData>({
    resolver: zodResolver(invitacionLoginSchema),
    defaultValues: { token, email: '', password: '', esRegistroNuevo: false },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  function handleSubmit() {
    form.handleSubmit((data) => {
      mutation.mutate(data, {
        onSuccess,
        onError: (error) => {
          const apiError = parseApiError(error)
          const fieldErrors = resolveApiFieldErrors(apiError, t)
          if (Object.keys(fieldErrors).length > 0) {
            Object.entries(fieldErrors).forEach(([field, message]) => {
              form.setError(field as keyof InvitacionLoginFormData, {
                message,
              })
            })
          }
        },
      })
    })()
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <Input
        label={t('auth.login.emailLabel')}
        type="email"
        placeholder={t('auth.login.emailPlaceholder')}
        autoComplete="email"
        error={form.formState.errors.email?.message
          ? t(form.formState.errors.email.message) : undefined}
        {...form.register('email')}
      />
      <Input
        label={t('auth.login.passwordLabel')}
        type="password"
        placeholder={t('auth.login.passwordPlaceholder')}
        autoComplete="current-password"
        error={form.formState.errors.password?.message
          ? t(form.formState.errors.password.message) : undefined}
        {...form.register('password')}
      />
      <Button onClick={handleSubmit} loading={mutation.isPending}>
        {mutation.isPending ? t('common.loading') : t('auth.invitacion.submitLogin')}
      </Button>
    </div>
  )
}

// --- Register Tab ---

function InviteRegisterForm({
  token,
  mutation,
  onSuccess,
}: {
  token: string
  mutation: ReturnType<typeof useAceptarInvitacion>
  onSuccess: () => void
}) {
  const { t } = useTranslation()

  const form = useForm<InvitacionRegistroFormData>({
    resolver: zodResolver(invitacionRegistroSchema),
    defaultValues: {
      token,
      email: '',
      nombre: '',
      apellido: '',
      tipoDocumento: 'dni',
      numeroDocumento: '',
      password: '',
      confirmPassword: '',
      esRegistroNuevo: true,
    },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const passwordValue = useWatch({ control: form.control, name: 'password' })
  const documentType = useWatch({ control: form.control, name: 'tipoDocumento' })

  const docTypeOptions = [
    { value: 'dni', label: t('auth.registro.docTypes.dni') },
    { value: 'cuit', label: t('auth.registro.docTypes.cuit') },
    { value: 'pasaporte', label: t('auth.registro.docTypes.passport') },
  ]

  function handleSubmit() {
    form.handleSubmit((data) => {
      const { confirmPassword, ...request } = data
      void confirmPassword
      mutation.mutate(request, {
        onSuccess,
        onError: (error) => {
          const apiError = parseApiError(error)
          const fieldErrors = resolveApiFieldErrors(apiError, t)
          if (Object.keys(fieldErrors).length > 0) {
            Object.entries(fieldErrors).forEach(([field, message]) => {
              form.setError(field as keyof InvitacionRegistroFormData, {
                message,
              })
            })
          }
        },
      })
    })()
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <Input
        label={t('auth.login.emailLabel')}
        type="email"
        placeholder={t('auth.login.emailPlaceholder')}
        autoComplete="email"
        error={form.formState.errors.email?.message
          ? t(form.formState.errors.email.message) : undefined}
        {...form.register('email')}
      />
      <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
        <Input
          label={t('auth.registro.nombreLabel')}
          placeholder={t('auth.invitacion.examples.firstName')}
          autoComplete="given-name"
          error={form.formState.errors.nombre?.message
            ? t(form.formState.errors.nombre.message) : undefined}
          {...form.register('nombre')}
        />
        <Input
          label={t('auth.registro.apellidoLabel')}
          placeholder={t('auth.invitacion.examples.lastName')}
          autoComplete="family-name"
          error={form.formState.errors.apellido?.message
            ? t(form.formState.errors.apellido.message) : undefined}
          {...form.register('apellido')}
        />
      </div>
      <div className="grid grid-cols-[100px_1fr] gap-3 max-[480px]:grid-cols-1">
        <Select
          label={t('auth.registroEmpresa.docLabel')}
          options={docTypeOptions}
          error={form.formState.errors.tipoDocumento?.message
            ? t(form.formState.errors.tipoDocumento.message) : undefined}
          {...form.register('tipoDocumento')}
        />
        <Input
          label={t('auth.registro.docNumberLabel')}
          placeholder={t('auth.invitacion.examples.docNumber')}
          className="font-mono"
          autoComplete="off"
          inputMode={resolveDocumentInputMode(documentType)}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="none"
          error={form.formState.errors.numeroDocumento?.message
            ? t(form.formState.errors.numeroDocumento.message) : undefined}
          {...form.register('numeroDocumento')}
        />
      </div>
      <Input
        label={t('auth.registro.passwordLabel')}
        type="password"
        placeholder={t('auth.registro.passwordPlaceholder')}
        autoComplete="new-password"
        error={form.formState.errors.password?.message
          ? t(form.formState.errors.password.message) : undefined}
        {...form.register('password')}
      />
      <PasswordStrength password={passwordValue} />
      <Input
        label={t('auth.registro.confirmPasswordLabel')}
        type="password"
        placeholder={t('auth.registro.confirmPasswordPlaceholder')}
        autoComplete="new-password"
        error={form.formState.errors.confirmPassword?.message
          ? t(form.formState.errors.confirmPassword.message) : undefined}
        {...form.register('confirmPassword')}
      />
      <Button onClick={handleSubmit} loading={mutation.isPending}>
        {mutation.isPending ? t('common.loading') : t('auth.invitacion.submitRegister')}
      </Button>
    </div>
  )
}

// --- Success ---

function InviteSuccess() {
  const { t } = useTranslation()

  return (
    <div className="rounded-2xl bg-[var(--color-surface-1)] p-8 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-cyan)]/10">
        <CheckCircle className="h-8 w-8 text-[var(--color-brand-cyan)]" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
        {t('auth.invitacion.success.title')}
      </h2>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        {t('auth.invitacion.success.subtitle')}
      </p>
    </div>
  )
}
