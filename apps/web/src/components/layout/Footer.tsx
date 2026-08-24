import { cn } from '@/lib/classNames'
import { Trans, useTranslation } from 'react-i18next'
import { LuGithub } from 'react-icons/lu'
import {
  RiBilibiliLine,
  RiSubwayFill,
  RiTwitterXFill,
  RiZhihuFill,
} from 'react-icons/ri'
import { RiRssLine } from 'react-icons/ri'
import { SiXiaohongshu } from 'react-icons/si'

const TRAVELLINGS_URL = 'https://www.travellings.cn/go.html'

export function Footer({
  className,
  variant = 'default',
}: {
  className?: string
  variant?: 'default' | 'home'
}) {
  const { t, i18n } = useTranslation()
  const year = new Date().getFullYear()
  const feedPath = i18n.language?.startsWith('zh') ? '/feeds/zh/' : '/feeds/en/'
  const isHomeVariant = variant === 'home'

  return (
    <footer
      className={cn(
        isHomeVariant
          ? 'mt-20 border-t border-white/10 py-8 text-center text-sm text-white/58'
          : 'mt-20 border-t border-slate-200 py-8 text-center text-sm text-[var(--text-secondary)] transition-colors dark:border-[var(--border-color)]',
        className
      )}
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex justify-center gap-4">
          <a
            href="https://github.com/MarkXuJQ"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'transition-colors',
              isHomeVariant
                ? 'hover:text-white'
                : 'hover:text-[var(--text-primary)]'
            )}
            aria-label="GitHub"
          >
            <LuGithub size={20} />
          </a>
          <a
            href="https://space.bilibili.com/351772037"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'transition-colors',
              isHomeVariant
                ? 'hover:text-white'
                : 'hover:text-[var(--text-primary)]'
            )}
            aria-label="Bilibili"
          >
            <RiBilibiliLine size={20} />
          </a>
          <a
            href="https://x.com/MXu269/articles"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'transition-colors',
              isHomeVariant
                ? 'hover:text-white'
                : 'hover:text-[var(--text-primary)]'
            )}
            aria-label="X (Twitter)"
          >
            <RiTwitterXFill size={20} />
          </a>
          <a
            href="https://www.zhihu.com/people/mark-81-75"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'transition-colors',
              isHomeVariant
                ? 'hover:text-white'
                : 'hover:text-[var(--text-primary)]'
            )}
            aria-label="Zhihu"
          >
            <RiZhihuFill size={20} />
          </a>
          <a
            href="https://www.xiaohongshu.com/user/profile/62f4f889000000001e01e89e"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'transition-colors',
              isHomeVariant
                ? 'hover:text-white'
                : 'hover:text-[var(--text-primary)]'
            )}
            aria-label="小红书"
          >
            <SiXiaohongshu size={20} />
          </a>
          <a
            href={TRAVELLINGS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'transition-colors',
              isHomeVariant
                ? 'hover:text-white'
                : 'hover:text-[var(--text-primary)]'
            )}
            aria-label={t('travellings.aria')}
            title={t('travellings.aria')}
          >
            <RiSubwayFill size={20} />
          </a>
          <a
            href={feedPath}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'transition-colors',
              isHomeVariant
                ? 'hover:text-white'
                : 'hover:text-[var(--text-primary)]'
            )}
            aria-label="Atom"
          >
            <RiRssLine size={20} />
          </a>
          {/* Add more social links here */}
          {/* Example:
          <a
            href="mailto:your.email@example.com"
            className="transition-colors hover:text-[var(--text-primary)]"
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
                  className={cn(
                    'underline',
                    isHomeVariant
                      ? 'hover:text-white'
                      : 'hover:text-[var(--text-primary)]'
                  )}
                >
                  CC BY-NC-SA 4.0
                </a>,
              ]}
            />
          </p>
          <p
            className={cn(
              'text-xs',
              isHomeVariant ? 'text-white/34' : 'text-[var(--text-disabled)]'
            )}
          >
            {t('footer.builtWith')}
          </p>
        </div>
      </div>
    </footer>
  )
}
