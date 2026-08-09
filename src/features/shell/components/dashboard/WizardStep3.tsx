import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/legacy/Input'
import { Select } from '@/shared/ui/legacy/Select'
import { step3Schema, type Step3Data } from '../../schemas/onboarding-schemas'

const LICENCIAS = [
  'A1 / A2 (moto)',
  'B1 (auto particular)',
  'B2 (auto con acoplado)',
  'C1 / C2 (camión)',
  'D1 / D2 (transporte de pasajeros)',
  'E1 / E2 (camión con acoplado)',
]

interface Props {
  onFinish: () => void
  onSkip: () => void
}

export function WizardStep3({ onFinish, onSkip }: Props) {
  const { t } = useTranslation()
  const { register, handleSubmit } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
  })

  const licenciaOptions = [
    { value: '', label: t('shell.dashboard.onboarding.selectLicense') },
    ...LICENCIAS.map(l => ({ value: l, label: l })),
  ]

  return (
    <form onSubmit={handleSubmit(onFinish)} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          {t('shell.dashboard.onboarding.step3Title')}{' '}
          <span className="text-xs font-normal text-text-tertiary">{t('shell.dashboard.onboarding.optional')}</span>
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{t('shell.dashboard.onboarding.step3Desc')}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label={t('shell.dashboard.onboarding.condNombreLabel')} placeholder={t('shell.dashboard.onboarding.condNombrePlaceholder')} {...register('nombre')} />
        <Input label={t('shell.dashboard.onboarding.condApellidoLabel')} placeholder={t('shell.dashboard.onboarding.condApellidoPlaceholder')} {...register('apellido')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label={t('shell.dashboard.onboarding.condDniLabel')} placeholder={t('shell.dashboard.onboarding.condDniPlaceholder')} className="font-mono" {...register('dni')} />
        <Input type="email" label={t('shell.dashboard.onboarding.condEmailLabel')} placeholder={t('shell.dashboard.onboarding.condEmailPlaceholder')} {...register('email')} />
      </div>
      <Select label={t('shell.dashboard.onboarding.condLicenciaLabel')} options={licenciaOptions} {...register('licenciaCategoria')} />
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onSkip} className="rounded-lg px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary">
          {t('shell.dashboard.onboarding.skipFinish')}
        </button>
        <button type="submit" className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-medium text-bg-canvas transition-opacity hover:opacity-90">
          {t('shell.dashboard.onboarding.finish')}
        </button>
      </div>
    </form>
  )
}
