import { useMemo, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RiLinksLine } from 'react-icons/ri'
import { Link, useOutletContext } from 'react-router-dom'
import { DeferredComments } from '@/components/comments/DeferredComments'
import { FriendLinks } from '@/components/links/FriendLinks'
import { getFriendLinkLabels } from '@/components/links/friendLinksData'
import { Seo } from '@/components/seo/Seo'
import { getSiteUrl, toAbsoluteUrl } from '@/components/seo/shared'
import { useCodeBlockEnhancements } from '@/hooks/useCodeBlockEnhancements'
import type { ArchiveOutletContext } from '@/layouts/ArchiveLayout'

export function Links() {
  const { t, i18n } = useTranslation()
  const { simpleMode = false } = useOutletContext<ArchiveOutletContext>()
  const isZh = Boolean(i18n.language?.startsWith('zh'))
  const labels = getFriendLinkLabels(isZh)
  const siteInfo = useMemo(() => {
    const siteUrl = getSiteUrl()

    return {
      name: t('siteTitle'),
      url: siteUrl,
      avatar: toAbsoluteUrl('/images/IMG_1766.JPG', siteUrl),
      description:
        '慢慢更新，慢慢打磨。写代码、看电影、出门逛街、记录一点不高级的快乐，不算深刻的思考🤔',
    }
  }, [t])

  return (
    <div className={simpleMode ? styles.simpleContainer : styles.container}>
      <Seo title={labels.title} description={labels.pageDescription} />

      <header
        className={
          simpleMode
            ? styles.simpleHeader
            : 'mb-8 flex flex-wrap items-start justify-between gap-4 pb-5'
        }
      >
        <div className="min-w-0">
          <div className={simpleMode ? '' : 'mb-3 flex items-center gap-3'}>
            {!simpleMode ? (
              <RiLinksLine
                className="h-8 w-8 text-blue-500"
                aria-hidden="true"
              />
            ) : null}
            <h1
              className={
                simpleMode
                  ? 'text-3xl font-bold text-[var(--text-primary)]'
                  : 'text-3xl font-bold text-slate-900 dark:text-slate-100'
              }
            >
              {labels.title}
            </h1>
          </div>
          <p
            className={
              simpleMode
                ? 'mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]'
                : 'max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400'
            }
          >
            {labels.pageDescription}
          </p>
        </div>

        <Link
          to="/blog"
          className={simpleMode ? styles.simpleBackLink : styles.backLink}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>{labels.backToBlog}</span>
        </Link>
      </header>

      <FriendLinks simple={simpleMode} />

      {!simpleMode ? (
        <section className="mt-14 pt-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {labels.applyTitle}
            </h2>
          </div>

          <div className={styles.applyGrid}>
            <div className="min-w-0">
              <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
                {labels.applyDescription}
              </p>

              <div className={styles.rulesBox}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {labels.rulesTitle}
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {labels.rules.map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
                        aria-hidden="true"
                      />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <OwnLinkInfoCodeBlock siteInfo={siteInfo} isZh={isZh} />
          </div>

          <DeferredComments
            containerId="twikoo-links"
            path="/links"
            className="mt-8 mb-0"
            showTitle={false}
          />
        </section>
      ) : null}
    </div>
  )
}

function OwnLinkInfoCodeBlock({
  siteInfo,
  isZh,
}: {
  siteInfo: {
    name: string
    url: string
    avatar: string
    description: string
  }
  isZh: boolean
}) {
  const { t } = useTranslation()
  const codeBlockRef = useRef<HTMLDivElement | null>(null)
  const code = useMemo(() => JSON.stringify(siteInfo, null, 2), [siteInfo])
  useCodeBlockEnhancements(
    codeBlockRef,
    {
      copy: t('codeBlock.copy'),
      copied: t('codeBlock.copied'),
      collapse: t('codeBlock.collapse'),
      expand: t('codeBlock.expand'),
      plainText: t('codeBlock.plainText'),
      scroll: t('codeBlock.scroll'),
      wrap: t('codeBlock.wrap'),
    },
    code
  )

  return (
    <aside className={styles.ownInfoCode}>
      <div ref={codeBlockRef} className="markdown-body">
        <p className={styles.formatHint}>
          {isZh ? (
            <>
              申请的格式：
              <br />
              你可以按照这个结构来申请，如果有多余的信息也可以，但我会选择性的展示哦。
            </>
          ) : (
            "Format requirement: you can apply using this structure. It's ok if you have extra information, but I will selectively display them. :)"
          )}
        </p>
        <pre>
          <code className="language-json">{code}</code>
        </pre>
      </div>
      <span className="sr-only">{isZh ? '本站信息' : 'My link info'}</span>
    </aside>
  )
}

const styles = {
  container: 'mx-auto w-full max-w-5xl flex-1 px-4 py-8',
  simpleContainer: 'mx-auto w-full max-w-3xl flex-1 px-0 py-2',
  simpleHeader:
    'mb-8 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-b border-[var(--border-color)] pb-4',
  backLink:
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  simpleBackLink:
    'inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]',
  applyGrid:
    'grid gap-5 xl:grid-cols-[minmax(18rem,0.82fr)_minmax(28rem,1.18fr)]',
  rulesBox:
    'mt-6 rounded-xl border border-slate-200/70 bg-white/70 p-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] dark:border-0 dark:bg-[#17191c]/70 dark:shadow-none',
  ownInfoCode:
    'min-w-0 [&_.md-code-action]:text-[0.68rem] [&_.md-code-frame]:m-0 [&_.md-code-frame]:shadow-[0_12px_28px_rgba(15,23,42,0.12)] [&_.md-code-language]:text-[0.78rem] [&_.md-code-pre]:!py-4 [&_.md-code-pre]:text-[0.82rem] [&_.md-code-pre_code]:text-[0.82rem] [&_.md-code-toolbar]:top-3',
  formatHint: 'mb-3 text-sm leading-6 text-slate-500 dark:text-slate-400',
}
