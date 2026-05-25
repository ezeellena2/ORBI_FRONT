import { useTranslation } from 'react-i18next'

type TracAutoMarkProps = {
  compact?: boolean
}

export function TracAutoMark({ compact = false }: TracAutoMarkProps) {
  const { t } = useTranslation()
  const gapClass = compact ? 'gap-2' : 'gap-3'
  const squareClass = compact ? 'h-10 w-10 rounded-[1rem]' : 'h-12 w-12 rounded-[1.125rem]'
  const titleClass = compact ? 'text-lg' : 'text-xl'

  return (
    <div className={`flex items-center ${gapClass}`}>
      <div
        className={`flex items-center justify-center bg-[image:var(--gradient-brand)] shadow-[0_0_32px_rgba(6,182,212,0.2)] ${squareClass}`}
      >
        <svg
          aria-hidden="true"
          className="h-6 w-6 text-white"
          viewBox="0 0 40 40"
          fill="none"
        >
          <path
            d="M9 23.5L20 10l11 13.5M13.5 30h13"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div>
        <div className={`font-semibold tracking-[-0.03em] text-text-primary ${titleClass}`}>
          OR<span className="text-brand-cyan">BI</span>
        </div>
        <div className="text-[0.68rem] uppercase tracking-[0.3em] text-text-tertiary">
          {t('common.brandPlatform')}
        </div>
      </div>
    </div>
  )
}
