import { Trans, useTranslation } from 'react-i18next'
import {
  FaCreativeCommonsBy,
  FaCreativeCommonsNc,
  FaCreativeCommonsSa,
} from 'react-icons/fa'
import { SignatureAnimation } from '@/components/blog/SignatureAnimation'
import { CC_LICENSE_URL } from '@/lib/links/socialLinks'

export function Copyright() {
  const { t } = useTranslation()

  return (
    <div className="font-round relative my-4 overflow-hidden rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-slate-50/60 px-4 py-2 dark:border-[#2b2f36] dark:from-[#17191c] dark:via-[#14171a] dark:to-[#17191c]">
      <div className="pointer-events-none absolute -top-6 -right-7 rotate-[-35deg] opacity-[0.08] dark:opacity-[0.12]">
        <div className="relative h-[209px] w-[224px]">
          <FaCreativeCommonsBy className="absolute top-0 left-0 h-28 w-28 text-slate-700 dark:text-slate-200" />
          <FaCreativeCommonsNc className="absolute top-0 left-[112px] h-28 w-28 text-slate-700 dark:text-slate-200" />
          <FaCreativeCommonsSa className="absolute top-[97px] left-[56px] h-28 w-28 text-slate-700 dark:text-slate-200" />
        </div>
      </div>
      <div>
        <div className="text-lg font-semibold whitespace-nowrap text-slate-800 dark:text-slate-100">
          {t('blog.copyright.title', 'Copyright')}
        </div>
        <SignatureAnimation
          width={140}
          duration={2}
          hold={1.5}
          fade={0.4}
          interval={8}
          className="absolute top-5 right-4 text-black sm:top-1/2 sm:-translate-y-1/2 dark:text-white"
        />
        <div className="mt-1 space-y-0.5 pt-12 pl-2 text-sm leading-6 sm:pt-0 sm:pr-36">
          <div className="flex items-baseline gap-2">
            <span className="min-w-[4.5rem] shrink-0 font-semibold whitespace-nowrap text-slate-700 dark:text-slate-200">
              {`${t('blog.copyright.author')}:`}
            </span>
            <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">
              Mark Xu
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="min-w-[4.5rem] shrink-0 font-semibold whitespace-nowrap text-slate-700 dark:text-slate-200">
              {`${t('blog.copyright.license')}:`}
            </span>
            <span className="min-w-0 text-slate-600 dark:text-slate-300">
              <Trans
                i18nKey="blog.copyright.statement"
                values={{ license: 'CC BY-NC-SA 4.0' }}
                components={[
                  <a
                    key="license-link"
                    href={CC_LICENSE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="CC BY-NC-SA 4.0"
                    data-link-preview="off"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  />,
                ]}
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
