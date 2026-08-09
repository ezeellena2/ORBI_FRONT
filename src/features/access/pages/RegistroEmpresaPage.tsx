import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  registroEmpresaSchema,
  type RegistroEmpresaFormData,
} from '../schemas/registro-empresa-schema'
import { useRegistroEmpresa } from '../hooks/useRegistroEmpresa'
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
import { ModuleCard } from './registro-empresa/ModuleCard'
import { StepContainer, StepNav, LoginLink } from '../components/StepLayout'
import { resolveDocumentInputMode } from '@/shared/utils/document-input'
import { useMultiStepUrl } from '@/shared/hooks/useMultiStepUrl'

const TOTAL_STEPS = 4

const AVAILABLE_MODULES = [
  { id: 'flota', icon: '\uD83D\uDE9B' },
  { id: 'concesionaria', icon: '\uD83C\uDFE2' },
  { id: 'taller', icon: '\uD83D\uDD27' },
  { id: 'seguros', icon: '\uD83D\uDEE1\uFE0F' },
  { id: 'alquileres', icon: '\uD83D\uDD11' },
  { id: 'movilidad', icon: '\uD83D\uDCF1' },
  { id: 'delivery', icon: '\uD83D\uDCE6' },
] as const

/**
 * Registro empresa de 4 pasos alineado con mockup registro-empresa/index.html.
 * Pasos: 1-Contacto, 2-Password, 3-Empresa, 4-Modulos.
 * Al enviar el formulario navega a la verificacion por email con ticket en URL.
 */
export function RegistroEmpresaPage() {
  const { t } = useTranslation()
  const { currentStep, goToStep, goBack } = useMultiStepUrl({ totalSteps: TOTAL_STEPS })
  const navigate = useNavigate()

  const form = useForm<RegistroEmpresaFormData>({
    resolver: zodResolver(registroEmpresaSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      tipoDocumento: 'dni',
      numeroDocumento: '',
      password: '',
      confirmPassword: '',
      empresaNombre: '',
      empresaCuit: '',
      empresaRubro: '',
      modulos: [],
    },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const registroMutation = useRegistroEmpresa()

  const generalError = (() => {
    if (!registroMutation.error) return null
    const apiError = parseApiError(registroMutation.error)
    if (hasApiFieldErrors(apiError)) return null
    return resolveApiErrorMessage(apiError, t)
  })()

  const passwordValue = useWatch({ control: form.control, name: 'password' })
  const selectedModules = useWatch({ control: form.control, name: 'modulos' })
  const documentType = useWatch({ control: form.control, name: 'tipoDocumento' })

  const docTypeOptions = [
    { value: 'dni', label: t('auth.registro.docTypes.dni') },
    { value: 'cuit', label: t('auth.registro.docTypes.cuit') },
    { value: 'pasaporte', label: t('auth.registro.docTypes.passport') },
  ]

  const rubroOptions = [
    { value: '', label: t('auth.registroEmpresa.rubroPlaceholder') },
    { value: 'transporte', label: t('auth.registroEmpresa.rubros.transporte') },
    { value: 'concesionaria', label: t('auth.registroEmpresa.rubros.concesionaria') },
    { value: 'taller', label: t('auth.registroEmpresa.rubros.taller') },
    { value: 'seguros', label: t('auth.registroEmpresa.rubros.seguros') },
    { value: 'alquiler', label: t('auth.registroEmpresa.rubros.alquiler') },
    { value: 'delivery', label: t('auth.registroEmpresa.rubros.delivery') },
    { value: 'movilidad', label: t('auth.registroEmpresa.rubros.movilidad') },
    { value: 'otro', label: t('auth.registroEmpresa.rubros.otro') },
  ]

  async function validateAndAdvance(
    fields: (keyof RegistroEmpresaFormData)[],
    nextStep: number,
  ) {
    const valid = await form.trigger(fields)
    if (valid) goToStep(nextStep)
  }

  function toggleModule(moduleId: string) {
    const current = form.getValues('modulos')
    const next = current.includes(moduleId)
      ? current.filter((m) => m !== moduleId)
      : [...current, moduleId]
    form.setValue('modulos', next, { shouldValidate: true })
  }

  function handleSubmit() {
    form.handleSubmit((data) => {
      const { confirmPassword, empresaNombre, empresaCuit, empresaRubro, ...rest } = data
      void confirmPassword
      registroMutation.mutate(
        {
          ...rest,
          empresa: {
            nombre: empresaNombre,
            cuit: empresaCuit,
            rubro: empresaRubro || undefined,
          },
        },
        {
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
                const key = field as keyof RegistroEmpresaFormData
                form.setError(key, { message })
              })
            }
          },
        },
      )
    })()
  }

  return (
    <div className="rounded-2xl bg-[var(--color-surface-1)] p-8">
      <RegistroProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {generalError ? (
        <div className="mb-6">
          <Alert variant="error">{generalError}</Alert>
        </div>
      ) : null}

      {/* Step 1: Datos de contacto */}
      {currentStep === 1 ? (
        <StepContainer
          title={t('auth.registroEmpresa.step1.title')}
          subtitle={t('auth.registroEmpresa.step1.subtitle')}
        >
          <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
            <Input
              label={t('auth.registro.nombreLabel')}
              placeholder={t('auth.registroEmpresa.examples.firstName')}
              autoComplete="given-name"
              error={fieldError(form, 'nombre', t)}
              {...form.register('nombre')}
            />
            <Input
              label={t('auth.registro.apellidoLabel')}
              placeholder={t('auth.registroEmpresa.examples.lastName')}
              autoComplete="family-name"
              error={fieldError(form, 'apellido', t)}
              {...form.register('apellido')}
            />
          </div>
          <Input
            label={t('auth.registroEmpresa.emailLabel')}
            type="email"
            placeholder={t('auth.registroEmpresa.examples.email')}
            autoComplete="email"
            error={fieldError(form, 'email', t)}
            {...form.register('email')}
          />
          <Input
            label={t('auth.registroEmpresa.phoneLabel')}
            type="tel"
            placeholder={t('auth.registroEmpresa.examples.phone')}
            autoComplete="tel"
            error={fieldError(form, 'telefono', t)}
            {...form.register('telefono')}
          />
          <div className="grid grid-cols-[140px_1fr] gap-4 max-[480px]:grid-cols-1">
            <Select
              label={t('auth.registroEmpresa.docLabel')}
              options={docTypeOptions}
              error={fieldError(form, 'tipoDocumento', t)}
              {...form.register('tipoDocumento')}
            />
            <Input
              label={t('auth.registro.docNumberLabel')}
              placeholder={t('auth.registroEmpresa.examples.docNumber')}
              className="font-mono"
              autoComplete="off"
              inputMode={resolveDocumentInputMode(documentType)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              error={fieldError(form, 'numeroDocumento', t)}
              {...form.register('numeroDocumento')}
            />
          </div>
          <StepNav>
            <Button
              onClick={() =>
                validateAndAdvance(
                  ['nombre', 'apellido', 'email', 'tipoDocumento', 'numeroDocumento'],
                  2,
                )
              }
            >
              {t('auth.registro.continue')}
            </Button>
          </StepNav>
          <LoginLink />
        </StepContainer>
      ) : null}

      {/* Step 2: Password */}
      {currentStep === 2 ? (
        <StepContainer
          title={t('auth.registroEmpresa.step2.title')}
          subtitle={t('auth.registroEmpresa.step2.subtitle')}
        >
          <Input
            label={t('auth.registro.passwordLabel')}
            type="password"
            placeholder={t('auth.registro.passwordPlaceholder')}
            autoComplete="new-password"
            error={fieldError(form, 'password', t)}
            {...form.register('password')}
          />
          <PasswordStrength password={passwordValue} />
          <Input
            label={t('auth.registro.confirmPasswordLabel')}
            type="password"
            placeholder={t('auth.registro.confirmPasswordPlaceholder')}
            autoComplete="new-password"
            error={fieldError(form, 'confirmPassword', t)}
            {...form.register('confirmPassword')}
          />
          <StepNav>
            <Button variant="secondary" onClick={goBack}>
              {t('auth.registro.back')}
            </Button>
            <Button onClick={() => validateAndAdvance(['password', 'confirmPassword'], 3)}>
              {t('auth.registro.continue')}
            </Button>
          </StepNav>
        </StepContainer>
      ) : null}

      {/* Step 3: Datos empresa */}
      {currentStep === 3 ? (
        <StepContainer
          title={t('auth.registroEmpresa.step3.title')}
          subtitle={t('auth.registroEmpresa.step3.subtitle')}
        >
          <Input
            label={t('auth.registroEmpresa.empresaNombreLabel')}
            placeholder={t('auth.registroEmpresa.examples.companyName')}
            error={fieldError(form, 'empresaNombre', t)}
            {...form.register('empresaNombre')}
          />
          <Input
            label={t('auth.registroEmpresa.empresaCuitLabel')}
            placeholder={t('auth.registroEmpresa.examples.companyCuit')}
            className="font-mono"
            error={fieldError(form, 'empresaCuit', t)}
            {...form.register('empresaCuit')}
          />
          <Select
            label={t('auth.registroEmpresa.empresaRubroLabel')}
            options={rubroOptions}
            error={fieldError(form, 'empresaRubro', t)}
            {...form.register('empresaRubro')}
          />
          <StepNav>
            <Button variant="secondary" onClick={goBack}>
              {t('auth.registro.back')}
            </Button>
            <Button
              onClick={() =>
                validateAndAdvance(['empresaNombre', 'empresaCuit'], 4)
              }
            >
              {t('auth.registro.continue')}
            </Button>
          </StepNav>
        </StepContainer>
      ) : null}

      {/* Step 4: Modulos */}
      {currentStep === 4 ? (
        <StepContainer
          title={t('auth.registroEmpresa.step4.title')}
          subtitle={t('auth.registroEmpresa.step4.subtitle')}
        >
          <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
            {AVAILABLE_MODULES.map((mod) => (
              <ModuleCard
                key={mod.id}
                icon={mod.icon}
                name={t(`auth.registroEmpresa.modules.${mod.id}`)}
                description={t(`auth.registroEmpresa.modulesDesc.${mod.id}`)}
                selected={selectedModules.includes(mod.id)}
                onToggle={() => toggleModule(mod.id)}
              />
            ))}
          </div>
          <p className="mt-3 text-center text-sm text-[var(--color-text-tertiary)]">
            {selectedModules.length > 0
              ? t('auth.registroEmpresa.modulesSelected', { count: selectedModules.length })
              : t('auth.registroEmpresa.modulesMinNotice')}
          </p>
          {form.formState.errors.modulos?.message ? (
            <p className="text-center text-xs text-[var(--color-danger)]">
              {t(form.formState.errors.modulos.message)}
            </p>
          ) : null}
          <StepNav>
            <Button variant="secondary" onClick={goBack}>
              {t('auth.registro.back')}
            </Button>
            <Button
              onClick={handleSubmit}
              loading={registroMutation.isPending}
              disabled={selectedModules.length === 0}
            >
              {registroMutation.isPending
                ? t('common.loading')
                : t('auth.registroEmpresa.submit')}
            </Button>
          </StepNav>
        </StepContainer>
      ) : null}

    </div>
  )
}

// --- Helpers ---

function fieldError(
  form: ReturnType<typeof useForm<RegistroEmpresaFormData>>,
  field: keyof RegistroEmpresaFormData,
  t: (key: string) => string,
): string | undefined {
  const msg = form.formState.errors[field]?.message
  return msg ? t(msg) : undefined
}
