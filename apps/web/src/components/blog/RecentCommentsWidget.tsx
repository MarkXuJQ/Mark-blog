import { useEffect, useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import type { BlogPostSummary } from '@/lib/content/posts'
import { getAllPostSummaries } from '@/lib/content/postSummaries'
import {
  getCachedRecentComments,
  loadRecentComments,
} from '@/lib/comments/recentCommentsCache'
import type { TwikooRecentComment } from '@/lib/comments/twikooLoader'

const RECENT_COMMENTS_LIMIT = 5
const DEFAULT_TWIKOO_ENV_ID = 'https://comments.markxu.icu/api/twikoo'

declare global {
  interface Window {
    __PRERENDER__?: boolean
  }
}

interface RecentCommentItem {
  id: string
  nick: string
  title: string
  href: string
  created: number
}

interface PostDirectory {
  commentPaths: string[]
  postsByPath: Map<string, { post: BlogPostSummary; postPath: string }>
}

function getCommentPath(post: BlogPostSummary) {
  const neutralSlug = post.slug.replace(/-(cn|en)$/i, '')
  return `/blog/${encodeURIComponent(neutralSlug)}`
}

function getDirectPostPath(post: BlogPostSummary) {
  return `/blog/${encodeURIComponent(post.slug)}`
}

function buildPostDirectory(language: string): PostDirectory {
  const primaryLanguage = language.startsWith('zh') ? 'zh' : 'en'
  const secondaryLanguage = primaryLanguage === 'zh' ? 'en' : 'zh'
  const postsByPath = new Map<
    string,
    { post: BlogPostSummary; postPath: string }
  >()
  const commentPaths = new Set<string>()

  for (const post of [
    ...getAllPostSummaries(primaryLanguage),
    ...getAllPostSummaries(secondaryLanguage),
  ]) {
    const commentPath = getCommentPath(post)
    const directPostPath = getDirectPostPath(post)
    const entry = { post, postPath: directPostPath }

    commentPaths.add(commentPath)
    postsByPath.set(commentPath, postsByPath.get(commentPath) ?? entry)
    postsByPath.set(directPostPath, postsByPath.get(directPostPath) ?? entry)
  }

  return {
    commentPaths: Array.from(commentPaths),
    postsByPath,
  }
}

function normalizeCommentPath(value: string) {
  try {
    const pathname = new URL(value, 'https://markxu-comment.local').pathname
    if (!pathname.startsWith('/blog/')) return null
    return pathname.replace(/\/+$/, '')
  } catch {
    return null
  }
}

function isValidCreated(value: number) {
  return Number.isFinite(value) && value > 0
}

export function RecentCommentsWidget() {
  const { i18n, t } = useTranslation()
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
  const twikooEnvId =
    import.meta.env.VITE_TWIKOO_ENV_ID || DEFAULT_TWIKOO_ENV_ID
  const postDirectory = useMemo(() => buildPostDirectory(locale), [locale])
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    [locale]
  )
  const recentCommentsQuery = useMemo(
    () => ({
      envId: twikooEnvId,
      urls: postDirectory.commentPaths,
      pageSize: RECENT_COMMENTS_LIMIT,
      includeReply: false,
    }),
    [postDirectory.commentPaths, twikooEnvId]
  )
  const [comments, setComments] = useState<TwikooRecentComment[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (typeof window === 'undefined' || window.__PRERENDER__) return

    if (recentCommentsQuery.urls.length === 0) {
      setStatus('ready')
      return
    }

    const cached = getCachedRecentComments(recentCommentsQuery)
    if (cached) {
      setComments(cached.comments)
      setStatus('ready')
      if (cached.isFresh) return
    }

    let cancelled = false

    const refreshRecentComments = async () => {
      try {
        if (!cached) setStatus('loading')
        const result = await loadRecentComments(recentCommentsQuery)

        if (cancelled) return
        setComments(result)
        setStatus('ready')
      } catch (error) {
        console.warn('Recent comments failed to load:', error)
        if (!cancelled && !cached) setStatus('error')
      }
    }

    void refreshRecentComments()

    return () => {
      cancelled = true
    }
  }, [recentCommentsQuery])

  const items = useMemo<RecentCommentItem[]>(() => {
    return comments.flatMap((comment) => {
      const commentPath = normalizeCommentPath(comment.url)
      const entry = commentPath
        ? postDirectory.postsByPath.get(commentPath)
        : undefined

      if (!commentPath || !entry || !isValidCreated(comment.created)) {
        return []
      }

      return [
        {
          id: comment.id,
          nick:
            comment.nick?.trim() || t('blog.sidebar.recentComments.anonymous'),
          title: entry.post.title,
          href: `${entry.postPath}#${encodeURIComponent(comment.id)}`,
          created: comment.created,
        },
      ]
    })
  }, [comments, postDirectory, t])

  if (typeof window !== 'undefined' && window.__PRERENDER__) return null

  return (
    <Card
      as="aside"
      className={styles.card}
      aria-labelledby="recent-comments-title"
    >
      <div className={styles.header}>
        <MessageCircle size={19} className="text-blue-500" aria-hidden="true" />
        <h3 id="recent-comments-title" className={styles.title}>
          {t('blog.sidebar.recentComments.title')}
        </h3>
      </div>

      {status === 'loading' ? (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => {
            const date = new Date(item.created)

            return (
              <Link
                key={item.id}
                to={item.href}
                title={item.title}
                aria-label={`${item.nick}: ${item.title}`}
                className={styles.item}
              >
                <div className="flex min-w-0 items-baseline justify-between gap-3">
                  <span className={styles.nick}>{item.nick}</span>
                  <time dateTime={date.toISOString()} className={styles.date}>
                    {dateFormatter.format(date)}
                  </time>
                </div>
                <p className={styles.postTitle}>{item.title}</p>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          {status === 'error'
            ? t('blog.sidebar.recentComments.unavailable')
            : t('blog.sidebar.recentComments.empty')}
        </p>
      )}
    </Card>
  )
}

const styles = {
  card: 'border border-slate-200/70 p-6 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] transition-all hover:shadow-[0_24px_56px_-34px_rgba(15,23,42,0.5)] dark:border-0 dark:shadow-none',
  header:
    'mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800',
  title: 'font-medium text-slate-800 dark:text-slate-100',
  item: 'group block py-3 first:pt-0 last:pb-0',
  nick: 'min-w-0 truncate text-sm font-medium text-[var(--text-primary)] transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400',
  date: 'shrink-0 text-[11px] tabular-nums text-[var(--text-disabled)]',
  postTitle:
    'mt-1 truncate text-xs leading-5 text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]',
}
