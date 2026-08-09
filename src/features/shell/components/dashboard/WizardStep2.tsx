import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/legacy/Input'
import { Select } from '@/shared/ui/legacy/Select'
import { step2Schema, type Step2Data } from '../../schemas/onboarding-schemas'

const GPS_MODELOS = ['Queclink GV75W', 'Concox GT06N', 'Teltonika FMB920', 'Jimi JM-VL03', 'Otro']

interface Props {
  onNext: () => void
  onSkip: () => void
}

export function WizardStep2({ onNext, onSkip }: Props) {
  const { t } = useTranslation()
  const { register, handleSubmit } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
  })

  const gpsOptions = [
    { value: '', label: t('shell.dashboard.onboarding.selectGpsModel') },
    ...GPS_MODELOS.map(m => ({ value: m, label: m })),
  ]

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          {t('shell.dashboard.onboarding.step2Title')}{' '}
          <span className="text-xs font-normal text-text-tertiary">{t('shell.dashboard.onboarding.optional')}</span>
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{t('shell.dashboard.onboarding.step2Desc')}</p>
      </div>
      <Input label={t('shell.dashboard.onboarding.imeiLabel')} placeholder={t('shell.dashboard.onboarding.imeiPlaceholder')} className="font-mono" maxLength={15} {...register('imei')} />
      <div className="grid grid-cols-2 gap-4">
        <Select label={t('shell.dashboard.onboarding.dispModeloLabel')} options={gpsOptions} {...register('dispModelo')} />
        <Input label={t('shell.dashboard.onboarding.simLabel')} placeholder={t('shell.dashboard.onboarding.simPlaceholder')} className="font-mono" {...register('sim')} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onSkip} className="rounded-lg px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary">
          {t('shell.dashboard.onboarding.skip')}
        </button>
        <button type="submit" className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-medium text-bg-canvas transition-opacity hover:opacity-90">
          {t('shell.dashboard.onboarding.assignDevice')}
        </button>
      </div>
    </form>
  )
}
