import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { registroSchema, type RegistroFormData } from '../schemas/registro-schema'
import { useRegistro } from '../hooks/useRegistro'
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
import { RegistroProgress } from './registro/RegistroProgress'
import { StepContainer, StepNav, LoginLink } from '../components/StepLayout'
import { resolveDocumentInputMode } from '@/shared/utils/document-input'
import { useMultiStepUrl } from '@/shared/hooks/useMultiStepUrl'

const TOTAL_STEPS = 4

/**
 * Registro B2C de 4 pasos alineado con mockup registro-b2c/index.html.
 * Pasos: 1-Email, 2-Documento, 3-Password, 4-Nombre.
 * Al enviar el formulario navega a la verificacion por email con ticket en URL.
 * Patron: React Hook Form + Zod + useRegistro hook + parseApiError.
 */
export function RegistroPage() {
  const { t } = useTranslation()
  const { currentStep, goToStep, goBack } = useMultiStepUrl({ totalSteps: TOTAL_STEPS })
  const navigate = useNavigate()

  const form = useForm<RegistroFormData>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      email: '',
      tipoDocumento: 'dni',
      numeroDocumento: '',
      password: '',
      confirmPassword: '',
      nombre: '',
      apellido: '',
    },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const registroMutation = useRegistro()
  const documentType = useWatch({ control: form.control, name: 'tipoDocumento' })

  const generalError = (() => {
    if (!registroMutation.error) return null
    const apiError = parseApiError(registroMutation.error)
    if (hasApiFieldErrors(apiError)) return null
    return resolveApiErrorMessage(apiError, t)
  })()

  const docTypeOptions = [
    { value: 'dni', label: t('auth.registro.docTypes.dni') },
    { value: 'cuit', label: t('auth.registro.docTypes.cuit') },
    { value: 'pasaporte', label: t('auth.registro.docTypes.passport') },
    { value: 'otro', label: t('auth.registro.docTypes.other') },
  ]

  async function validateAndAdvance(fields: (keyof RegistroFormData)[], nextStep: number) {
    const valid = await form.trigger(fields)
    if (valid) {
      goToStep(nextStep)
    }
  }

  function handleSubmit() {
    form.handleSubmit((data) => {
      const { confirmPassword, ...request } = data
      void confirmPassword
      registroMutation.mutate(request, {
        onSuccess: (response) => {
          navigate(
            `/auth/verificar-email-registro?ticket=${encodeURIComponent(response.data.verificationTicket)}`,
            { replace: true },
          )
        },
        onError: (error) => {
          const apiError = parseApiError(error)
          const fieldErrors = resolveApiFieldErrors(apiError, t)
          if (Object.keys(fieldErrors).length > 0) {
            Object.entries(fieldErrors).forEach(([field, message]) => {
              const key = field as keyof RegistroFormData
              form.setError(key, { message })
            })
            // Navegar al paso del primer campo con error
            const fieldStepMap: Record<string, number> = {
              email: 1, tipoDocumento: 2, numeroDocumento: 2,
              password: 3, nombre: 4, apellido: 4,
            }
            const firstField = Object.keys(fieldErrors)[0]
            if (firstField && fieldStepMap[firstField]) {
              goToStep(fieldStepMap[firstField])
            }
          }
        },
      })
    })()
  }

  const passwordValue = useWatch({ control: form.control, name: 'password' })

  return (
    <div className="rounded-2xl bg-[var(--color-surface-1)] p-8">
      <RegistroProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {generalError ? (
        <div className="mb-6">
          <Alert variant="error">{generalError}</Alert>
        </div>
      ) : null}

      {/* Step 1: Email */}
      {currentStep === 1 ? (
        <StepContainer
          title={t('auth.registro.step1.title')}
          subtitle={t('auth.registro.step1.subtitle')}
        >
          <Input
            label={t('auth.registro.emailLabel')}
            type="email"
            placeholder={t('auth.login.emailPlaceholder')}
            autoComplete="email"
            error={form.formState.errors.email?.message
              ? t(form.formState.errors.email.message) : undefined}
            {...form.register('email')}
          />
          <StepNav>
            <Button onClick={() => validateAndAdvance(['email'], 2)}>
              {t('auth.registro.continue')}
            </Button>
          </StepNav>
          <LoginLink />
        </StepContainer>
      ) : null}

      {/* Step 2: Documento */}
      {currentStep === 2 ? (
        <StepContainer
          title={t('auth.registro.step2.title')}
          subtitle={t('auth.registro.step2.subtitle')}
        >
          <div className="grid grid-cols-[140px_1fr] gap-4 max-[480px]:grid-cols-1">
            <Select
              label={t('auth.registro.docTypeLabel')}
              options={docTypeOptions}
              error={form.formState.errors.tipoDocumento?.message
                ? t(form.formState.errors.tipoDocumento.message) : undefined}
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
              error={form.formState.errors.numeroDocumento?.message
                ? t(form.formState.errors.numeroDocumento.message) : undefined}
              {...form.register('numeroDocumento')}
            />
          </div>
          <StepNav>
            <Button variant="secondary" onClick={goBack}>
              {t('auth.registro.back')}
            </Button>
            <Button onClick={() => validateAndAdvance(['tipoDocumento', 'numeroDocumento'], 3)}>
              {t('auth.registro.continue')}
            </Button>
          </StepNav>
        </StepContainer>
      ) : null}

      {/* Step 3: Password */}
      {currentStep === 3 ? (
        <StepContainer
          title={t('auth.registro.step3.title')}
          subtitle={t('auth.registro.step3.subtitle')}
        >
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
          <StepNav>
            <Button variant="secondary" onClick={goBack}>
              {t('auth.registro.back')}
            </Button>
            <Button onClick={() => validateAndAdvance(['password', 'confirmPassword'], 4)}>
              {t('auth.registro.continue')}
            </Button>
          </StepNav>
        </StepContainer>
      ) : null}

      {/* Step 4: Nombre */}
      {currentStep === 4 ? (
        <StepContainer
          title={t('auth.registro.step4.title')}
          subtitle={t('auth.registro.step4.subtitle')}
        >
          <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
            <Input
              label={t('auth.registro.nombreLabel')}
              type="text"
              placeholder={t('auth.registro.examples.firstName')}
              autoComplete="given-name"
              error={form.formState.errors.nombre?.message
                ? t(form.formState.errors.nombre.message) : undefined}
              {...form.register('nombre')}
            />
            <Input
              label={t('auth.registro.apellidoLabel')}
              type="text"
              placeholder={t('auth.registro.examples.lastName')}
              autoComplete="family-name"
              error={form.formState.errors.apellido?.message
                ? t(form.formState.errors.apellido.message) : undefined}
              {...form.register('apellido')}
            />
          </div>
          <StepNav>
            <Button variant="secondary" onClick={goBack}>
              {t('auth.registro.back')}
            </Button>
            <Button
              onClick={handleSubmit}
              loading={registroMutation.isPending}
            >
              {registroMutation.isPending
                ? t('common.loading')
                : t('auth.registro.submit')}
            </Button>
          </StepNav>
        </StepContainer>
      ) : null}

    </div>
  )
}
