import { Trans, useTranslation } from 'react-i18next'
import { Github } from 'lucide-react'
import { RiBilibiliLine } from "react-icons/ri";

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-slate-200 py-8 text-center text-sm text-slate-500 transition-colors dark:border-slate-800 dark:text-slate-400">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex justify-center gap-4">
          <a
            href="https://github.com/MarkXuJQ"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-200"
            aria-label="GitHub"
          >
            <Github size={20} />
          </a>
          <a
            href="https://space.bilibili.com/351772037"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-200"
            aria-label="Bilibili"
          >
            <RiBilibiliLine size={20} />
          </a>
          {/* Add more social links here */}
          {/* Example:
          <a
            href="mailto:your.email@example.com"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-200"
            aria-label="Email"
          >
            <Mail size={20} />
          </a>
          */}
        </div>

        <div className="flex flex-col gap-1">
          <p>{t('footer.copyright', { year })}</p>
          <p>
            <Trans
              i18nKey="footer.license"
              components={[
                <a
                  key="cc-link"
                  href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-slate-900 dark:hover:text-slate-200"
                >
                  CC BY-NC-SA 4.0
                </a>,
              ]}
            />
          </p>
          <p className="text-xs opacity-70">{t('footer.builtWith')}</p>
        </div>
      </div>
    </footer>
  )
}
