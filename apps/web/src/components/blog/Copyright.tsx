import { Trans, useTranslation } from 'react-i18next'
import {
  FaCreativeCommons,
  FaCreativeCommonsBy,
  FaCreativeCommonsNc,
  FaCreativeCommonsSa,
} from 'react-icons/fa'

export function Copyright() {
  const { t } = useTranslation()

  return (
    <div className="relative my-10 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-50/60 p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)] dark:border-[#2b2f36] dark:from-[#17191c] dark:via-[#14171a] dark:to-[#17191c]">
      <div className="pointer-events-none absolute -right-8 -top-16 h-96 w-96 rotate-[-35deg] opacity-[0.08] dark:opacity-[0.12]">
        <div className="absolute left-0 top-2 text-slate-700 dark:text-slate-200">
          <FaCreativeCommonsBy className="h-48 w-48" />
        </div>
        <div className="absolute right-0 top-6 text-slate-700 dark:text-slate-200">
          <FaCreativeCommonsNc className="h-48 w-48" />
        </div>
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 text-slate-700 dark:text-slate-200">
          <FaCreativeCommonsSa className="h-48 w-48" />
        </div>
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
            <FaCreativeCommons className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t('blog.copyright.title', 'Copyright')}
          </span>
        </div>
      </div>

      <ul className="grid gap-3 text-sm sm:grid-cols-2">
        <li className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          <span className="min-w-[4rem] font-bold text-slate-700 dark:text-slate-200">
            {t('blog.copyright.author')}:
          </span>
          <span className="text-slate-600 dark:text-slate-300">Mark Xu</span>
        </li>
        <li className="flex flex-col gap-1 sm:flex-row sm:gap-2 sm:col-span-2">
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
