import { useTranslation } from 'react-i18next'
import { Seo } from '../components/seo/Seo'

export function About() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t('about.title')} description={t('about.description')} />
      
      <div className="container mx-auto max-w-3xl px-4 py-12 md:py-20">
        <article className="prose prose-lg dark:prose-invert prose-slate max-w-none">
          <h1 className="mb-8 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            {t('about.title')}
          </h1>
          
          <div className="space-y-6 text-slate-700 dark:text-slate-300">
            <p className="text-xl font-medium leading-relaxed text-slate-800 dark:text-slate-200">
              {t('about.intro')}
            </p>
            <p className="leading-relaxed">
              {t('about.description')}
            </p>
          </div>
        </article>
      </div>
    </>
  )
}
