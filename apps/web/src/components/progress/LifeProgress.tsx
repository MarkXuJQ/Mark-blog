import { useTranslation } from 'react-i18next'

export function LifeProgress() {
  const { t } = useTranslation()

  return (
    <div className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-left dark:border-slate-700/70 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('underConstruction.lifeProgressTitle')}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {t('underConstruction.lifeProgressDesc')}
          </p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
          0%
        </span>
      </div>
      <div className="mt-4 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full w-[5%] rounded-full bg-slate-400 dark:bg-slate-600" />
      </div>
    </div>
  )
}
