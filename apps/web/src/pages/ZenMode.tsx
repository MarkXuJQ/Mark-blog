import { useTranslation } from 'react-i18next'
import { Card } from '../components/Card'

export function ZenMode() {
  const { t } = useTranslation()

  return (
    <Card className="mx-auto max-w-2xl py-20 text-center">
      <h1 className="mb-8 text-4xl font-light tracking-widest text-slate-800 dark:text-slate-100">
        {t('zenMode.title')}
      </h1>
      <p className="mb-12 text-lg font-light leading-loose text-slate-600 dark:text-slate-400">
        {t('zenMode.description')}
      </p>
      <div className="mx-auto h-px w-20 bg-slate-200 dark:bg-slate-700" />
    </Card>
  )
}
