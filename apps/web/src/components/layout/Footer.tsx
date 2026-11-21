import type { ReactNode } from 'react'
import { cn } from '@/lib/classNames'
import {
  CC_LICENSE_URL,
  getFeedBasePath,
  SOCIAL_LINKS,
  type SocialLinkId,
} from '@/lib/links/socialLinks'
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

const SOCIAL_ICONS: Record<SocialLinkId, ReactNode> = {
  github: <LuGithub size={20} aria-hidden="true" />,
  bilibili: <RiBilibiliLine size={20} aria-hidden="true" />,
  twitter: <RiTwitterXFill size={20} aria-hidden="true" />,
  zhihu: <RiZhihuFill size={20} aria-hidden="true" />,
  xiaohongshu: <SiXiaohongshu size={20} aria-hidden="true" />,
  travellings: <RiSubwayFill size={20} aria-hidden="true" />,
}

export function Footer({
  className,
  variant = 'default',
}: {
  className?: string
  variant?: 'default' | 'home'
}) {
  const { t, i18n } = useTranslation()
  const year = new Date().getFullYear()
  const feedPath = getFeedBasePath(i18n.language)
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
          {SOCIAL_LINKS.map((link) => {
            const label =
              link.id === 'travellings' ? t('travellings.aria') : link.label
            return (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'transition-colors',
                  isHomeVariant
                    ? 'hover:text-white'
                    : 'hover:text-[var(--text-primary)]'
                )}
                aria-label={label}
                title={link.id === 'travellings' ? label : undefined}
              >
                {SOCIAL_ICONS[link.id]}
              </a>
            )
          })}
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
            <RiRssLine size={20} aria-hidden="true" />
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
                  href={CC_LICENSE_URL}
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
              isHomeVariant ? 'text-white/34' : 'text-[var(--text-secondary)]'
            )}
          >
            {t('footer.builtWith')}
          </p>
        </div>
      </div>
    </footer>
  )
}
