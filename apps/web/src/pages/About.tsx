import { useTranslation, Trans } from 'react-i18next'
import { Seo } from '../components/seo/Seo'
import { Comments } from '../components/comments/Comments'
import { WebsiteCard } from '../components/ui/WebsiteCard'

export function About() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t('about.title')} description={t('about.description')} />

      <div className="mx-auto max-w-3xl px-4 py-12 md:py-20">
        <h1 className="mb-8 text-left text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
          {t('about.title')}
        </h1>

        <article className="prose prose-lg dark:prose-invert prose-slate max-w-none">
          <div className="space-y-8 text-slate-700 dark:text-slate-300">
            {/* Self Intro */}
            <p className="text-xl leading-relaxed font-medium text-slate-800 dark:text-slate-200">
              {t('about.intro')}
            </p>

            {/* About Website */}
            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {t('about.originTitle')}
              </h2>
              <p className="mb-6 leading-relaxed">
                <Trans
                  i18nKey="about.originContent"
                  components={[
                    <a
                      key="0"
                      href="https://blog.zhilu.site/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline decoration-2 underline-offset-2 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      blog.zhilu.site
                    </a>,
                  ]}
                />
              </p>

              <WebsiteCard
                url="https://blog.zhilu.site/"
                title="纸鹿摸鱼处"
                description="纸鹿大佬的博客，精美又高效，文笔成熟，是本站的灵感来源之一。"
                variant="horizontal"
                className="not-prose mx-auto my-6 max-w-lg"
              />
            </section>

            {/* Building Process */}
            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {t('about.techTitle')}
              </h2>
              <p className="leading-relaxed">{t('about.techContent')}</p>
            </section>

            {/* Future */}
            <p className="border-l-4 border-slate-200 pl-4 leading-relaxed text-slate-600 italic dark:border-slate-700 dark:text-slate-400">
              {t('about.futureContent')}
            </p>
          </div>
        </article>

        {/* Comments Section */}
        <div className="mt-16 border-t border-slate-200 pt-8 dark:border-slate-800">
          <Comments />
        </div>
      </div>
    </>
  )
}
