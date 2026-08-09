import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/legacy/Input'
import { Select } from '@/shared/ui/legacy/Select'
import { step1Schema, type Step1Data } from '../../schemas/onboarding-schemas'

const MARCAS = ['Ford', 'Toyota', 'Renault', 'Fiat', 'Mercedes-Benz', 'Volkswagen', 'Chevrolet', 'Iveco', 'Peugeot', 'Citroën', 'Otra']
const TIPOS = ['Auto', 'Utilitario', 'Camioneta', 'Camión chico', 'Camión grande', 'Moto', 'Bus', 'Otro']

interface Props {
  onNext: () => void
  onCancel: () => void
}

export function WizardStep1({ onNext, onCancel }: Props) {
  const { t } = useTranslation()
  const { register, handleSubmit, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  })

  const marcaOptions = [
    { value: '', label: t('shell.dashboard.onboarding.selectBrand') },
    ...MARCAS.map(m => ({ value: m, label: m })),
  ]
  const tipoOptions = [
    { value: '', label: t('shell.dashboard.onboarding.selectType') },
    ...TIPOS.map(tp => ({ value: tp, label: tp })),
  ]

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">{t('shell.dashboard.onboarding.step1Title')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('shell.dashboard.onboarding.step1Desc')}</p>
      </div>
      <Input label={t('shell.dashboard.onboarding.patenteLabel')} placeholder={t('shell.dashboard.onboarding.patentePlaceholder')} className="font-mono uppercase tracking-widest" maxLength={10} error={errors.patente?.message ? t(errors.patente.message) : undefined} {...register('patente')} />
      <div className="grid grid-cols-2 gap-4">
        <Select label={t('shell.dashboard.onboarding.marcaLabel')} options={marcaOptions} error={errors.marca?.message ? t(errors.marca.message) : undefined} {...register('marca')} />
        <Input label={t('shell.dashboard.onboarding.modeloLabel')} placeholder={t('shell.dashboard.onboarding.modeloPlaceholder')} error={errors.modelo?.message ? t(errors.modelo.message) : undefined} {...register('modelo')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input type="number" label={t('shell.dashboard.onboarding.anioLabel')} placeholder={t('shell.dashboard.onboarding.anioPlaceholder')} className="font-mono" error={errors.anio?.message ? t(errors.anio.message) : undefined} {...register('anio', { valueAsNumber: true })} />
        <Select label={t('shell.dashboard.onboarding.tipoLabel')} options={tipoOptions} error={errors.tipo?.message ? t(errors.tipo.message) : undefined} {...register('tipo')} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary">
          {t('shell.dashboard.onboarding.cancel')}
        </button>
        <button type="submit" className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-medium text-bg-canvas transition-opacity hover:opacity-90">
          {t('shell.dashboard.onboarding.createVehicle')}
        </button>
      </div>
    </form>
  )
}
