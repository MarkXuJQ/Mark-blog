import { useTranslation } from 'react-i18next'
import { Seo } from '../components/seo/Seo'

export function Life() {
  const { t } = useTranslation()
  const title = t('nav.life')
  const description = t('life.description', '记录日常与照片集。')

  return (
    <>
      <Seo title={title} description={description} />
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="mb-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        <p className="leading-relaxed text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
    </>
  )
}

