import { useEffect, useRef, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { DeferredComments } from '@/components/comments/DeferredComments'
import { Seo } from '@/components/seo/Seo'
import { cn } from '@/lib/utils'
import { WebsiteCard } from '@/components/ui/WebsiteCard'
import { Check, Copy, X } from 'lucide-react'

const CONTACT_EMAIL = 'xujianqiao86@gmail.com'
const CONTACT_QQ = '2960278146'
const FASCINATE_INLINE_STYLESHEET_URL =
  'https://fonts.googleapis.com/css2?family=Fascinate+Inline&display=swap'
type ContactTarget = 'email' | 'qq'
type CopyState = {
  target: ContactTarget | null
  status: 'idle' | 'copied' | 'failed'
}

export function About() {
  useAboutDisplayFont()

  const { t } = useTranslation()
  const commentsRef = useRef<HTMLDivElement>(null)
  const [copyState, setCopyState] = useState<CopyState>({
    target: null,
    status: 'idle',
  })
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [shouldNudgeContact, setShouldNudgeContact] = useState(false)

  useEffect(() => {
    if (copyState.status === 'idle') return

    const timer = window.setTimeout(() => {
      setCopyState({ target: null, status: 'idle' })
    }, 1800)

    return () => window.clearTimeout(timer)
  }, [copyState])

  const handleCopyContact = async (value: string, target: ContactTarget) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyState({ target, status: 'copied' })
    } catch {
      setCopyState({ target, status: 'failed' })
    }
  }

  useEffect(() => {
    if (!isContactOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsContactOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isContactOpen])

  useEffect(() => {
    const node = commentsRef.current
    if (!node || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return
    }

    let nudgeTimer: number | null = null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setShouldNudgeContact(true)
        if (nudgeTimer !== null) window.clearTimeout(nudgeTimer)
        nudgeTimer = window.setTimeout(() => {
          setShouldNudgeContact(false)
        }, 900)
      },
      { rootMargin: '0px 0px -45% 0px', threshold: 0.08 }
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
      if (nudgeTimer !== null) window.clearTimeout(nudgeTimer)
    }
  }, [])

  return (
    <>
      <Seo title={t('about.title')} description={t('about.description')} />

      <div className="relative mx-auto w-full max-w-2xl px-8 py-12 sm:px-6 md:py-20 lg:max-w-3xl lg:px-8">
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


              <WebsiteCard
                url="https://github.com/MarkXuJQ/Mark-blog"
                title="我的网站源码"
                description="这里是我的网站的源码仓库，欢迎同学们前来发现问题、一起学习！"
                variant="horizontal"
                className="not-prose mx-auto my-6 max-w-lg"
              />
              
            </section>

            {/* Future */}
            <p className="border-l-4 border-slate-200 pl-4 leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-400">
              {t('about.futureContent')}
            </p>
          </div>
        </article>

        {/* Comments Section */}
        <div
          ref={commentsRef}
          id="about-comments"
          className="relative mt-16 scroll-mt-24 pt-8"
        >
          <ContactPanel
            copyState={copyState}
            nudge={shouldNudgeContact}
            open={isContactOpen}
            onClose={() => setIsContactOpen(false)}
            onCopyContact={handleCopyContact}
            onToggle={() => setIsContactOpen((prev) => !prev)}
            t={t}
          />
          <DeferredComments />
        </div>
      </div>

    </>
  )
}

function useAboutDisplayFont() {
  useEffect(() => {
    if (typeof window === 'undefined' || window.__PRERENDER__) return

    const existingLink = document.head.querySelector<HTMLLinkElement>(
      'link[data-about-font="fascinate-inline"]'
    )
    if (existingLink) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FASCINATE_INLINE_STYLESHEET_URL
    link.dataset.aboutFont = 'fascinate-inline'
    document.head.appendChild(link)

    return () => link.remove()
  }, [])
}

function ContactPanel({
  copyState,
  nudge,
  open,
  onClose,
  onCopyContact,
  onToggle,
  t,
}: {
  copyState: CopyState
  nudge: boolean
  open: boolean
  onClose: () => void
  onCopyContact: (value: string, target: ContactTarget) => void
  onToggle: () => void
  t: ReturnType<typeof useTranslation>['t']
}) {
  const getCopyLabel = (target: ContactTarget) => {
    if (copyState.target !== target || copyState.status === 'idle') {
      return t('about.contact.copy')
    }

    return copyState.status === 'copied'
      ? t('about.contact.copyDone')
      : t('about.contact.copyFailed')
  }

  const getCopyStatus = (target: ContactTarget) =>
    copyState.target === target ? copyState.status : 'idle'

  return (
    <div className="not-prose pointer-events-none absolute top-0 right-0 z-30 hidden -translate-y-16 translate-x-[72%] lg:block">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "pointer-events-auto origin-center rotate-[-8deg] bg-transparent p-0 text-4xl leading-none text-slate-900 transition-transform hover:-translate-x-1 hover:-rotate-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-slate-100 [font-family:'Fascinate_Inline',cursive]",
          nudge && 'animate-[reach-out-wiggle_760ms_ease-in-out_1]'
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {t('about.contact.trigger')}
      </button>

      <div
        className={cn(
          'pointer-events-auto absolute right-0 top-14 w-[min(82vw,320px)] origin-top-right rotate-[-1.5deg] rounded-[1.2rem_1.7rem_1.35rem_1.55rem] border-2 border-slate-900 bg-[#fff8d8] p-4 text-slate-900 shadow-[8px_10px_0_rgba(15,23,42,0.18)] transition-all duration-200 dark:border-slate-100 dark:bg-[#202124] dark:text-slate-100 dark:shadow-[8px_10px_0_rgba(255,255,255,0.12)]',
          open
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
        )}
        role="dialog"
        aria-modal="false"
        aria-hidden={!open}
        aria-label={t('about.contact.title')}
      >
        <span
          aria-hidden="true"
          className="absolute -top-4 left-10 h-7 w-20 rotate-[-5deg] rounded-sm border border-amber-200/80 bg-amber-100/70 shadow-sm dark:border-amber-200/20 dark:bg-amber-100/20"
        />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <DoodleEnvelope />
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {t('about.contact.title')}
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('about.contact.primary')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-black/8 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t('about.contact.close')}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-[1rem_0.8rem_1.05rem_0.75rem] border-2 border-slate-900 bg-white p-2 shadow-[3px_4px_0_rgba(15,23,42,0.16)] dark:border-slate-100 dark:bg-[#17191c] dark:shadow-[3px_4px_0_rgba(255,255,255,0.12)]">
          <ContactMethod
            label={t('about.contact.email')}
            value={CONTACT_EMAIL}
            href={`mailto:${CONTACT_EMAIL}`}
            copyLabel={getCopyLabel('email')}
            copyStatus={getCopyStatus('email')}
            onCopy={() => onCopyContact(CONTACT_EMAIL, 'email')}
          />
          <ContactMethod
            label={t('about.contact.qq')}
            value={CONTACT_QQ}
            copyLabel={getCopyLabel('qq')}
            copyStatus={getCopyStatus('qq')}
            onCopy={() => onCopyContact(CONTACT_QQ, 'qq')}
          />
        </div>
      </div>
    </div>
  )
}

function ContactMethod({
  label,
  value,
  href,
  copyLabel,
  copyStatus,
  onCopy,
}: {
  label: string
  value: string
  href?: string
  copyLabel: string
  copyStatus: CopyState['status']
  onCopy: () => void
}) {
  const valueClassName =
    'block min-w-0 truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800 transition hover:text-blue-600 dark:bg-[#202124] dark:text-slate-100 dark:hover:text-blue-300'

  return (
    <div className="grid gap-2 py-2 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        <p className="mb-1 px-1 text-[11px] font-black tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {label}
        </p>
        {href ? (
          <a href={href} className={valueClassName}>
            {value}
          </a>
        ) : (
          <span className={valueClassName}>{value}</span>
        )}
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[0.9rem_0.75rem_0.8rem_1rem] border-2 border-slate-900 px-3 py-2 text-sm font-black transition-transform hover:-rotate-1 hover:scale-[1.01] dark:border-slate-100',
          copyStatus === 'copied'
            ? 'bg-emerald-400 text-slate-950'
            : copyStatus === 'failed'
              ? 'bg-rose-400 text-slate-950'
              : 'bg-[#ff8fab] text-slate-950'
        )}
      >
        {copyStatus === 'copied' ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <Copy size={16} aria-hidden="true" />
        )}
        {copyLabel}
      </button>
    </div>
  )
}

function DoodleEnvelope() {
  return (
    <svg
      width="54"
      height="48"
      viewBox="0 0 54 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      <path
        d="M9.6 15.8c6.1-2 24.5-2.3 34.7.4 1.5 6.7 1.1 15.4-.7 22.1-8.2 1.8-26.8 1.6-35.1-.8-1.4-6.1-1.3-15.2 1.1-21.7Z"
        fill="#9AE6B4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.2 17.2c4.6 4 9.6 7.7 15.8 11.3 5.9-3.5 11.6-7.7 16.2-11.2"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.4 36.8c4.4-3.5 8.9-6.7 13.7-9.6"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M44.1 36.5c-4.4-3.4-8.9-6.4-13.8-9.1"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M39.3 7.5c2.8-.8 5.4-.4 7.6 1.2"
        stroke="#FF8FAB"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M42.1 2.8c2.1.5 3.9 1.5 5.3 3.1"
        stroke="#FF8FAB"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
