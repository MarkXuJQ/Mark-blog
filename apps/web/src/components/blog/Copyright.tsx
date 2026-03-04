import { Trans, useTranslation } from 'react-i18next'

interface CopyrightProps {
  url: string
}

export function Copyright({ url }: CopyrightProps) {
  const { t } = useTranslation()

  return (
    <div className="my-8 rounded-lg border border-l-4 border-slate-200 border-l-blue-500 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <ul className="space-y-2 text-sm">
        <li className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          <span className="min-w-[4rem] font-bold text-slate-700 dark:text-slate-200">
            {t('blog.copyright.author')}:
          </span>
          <span className="text-slate-600 dark:text-slate-300">Mark Xu</span>
        </li>
        <li className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          <span className="min-w-[4rem] font-bold text-slate-700 dark:text-slate-200">
            {t('blog.copyright.link')}:
          </span>
          <a
            href={url}
            className="break-all text-blue-600 hover:underline dark:text-blue-400"
          >
            {url}
          </a>
        </li>
        <li className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          <span className="min-w-[4rem] font-bold text-slate-700 dark:text-slate-200">
            {t('blog.copyright.license')}:
          </span>
          <span className="text-slate-600 dark:text-slate-300">
            <Trans
              i18nKey="blog.copyright.statement"
              values={{ license: 'CC BY-NC-SA 4.0' }}
              components={[
                <a
                  key="license-link"
                  href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="CC BY-NC-SA 4.0"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                />
              ]}
            />
          </span>
        </li>
      </ul>
    </div>
  )
}
