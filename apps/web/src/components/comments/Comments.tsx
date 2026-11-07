import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LinkGuard } from './LinkGuard'
import {
  applyEmotionPack,
  getTwikooApi,
  loadTwikooScript,
} from '@/lib/comments/twikooLoader'
import { cn } from '@/lib/classNames'

// Declare Twikoo on window
declare global {
  interface Window {
    __PRERENDER__?: boolean
  }
}

// Re-entrancy guard: our own DOM edits below are observed by the MutationObserver
// and would otherwise re-trigger applyCustomizations in an endless loop, freezing
// the page. Set/check this flag around every pass.
let applyingCustomizations = false

// Custom OwO pack shipped with the site: the stock 颜文字/Emoji/Bilibili groups
// plus alu / Heybox / weisumeng / 罗小黑, merged into public/emotions/owo.json.
// Resolved against the current origin so it works in dev, preview and prod.
const EMOTION_CDN =
  import.meta.env.VITE_TWIKOO_EMOTION_CDN ||
  (typeof window === 'undefined'
    ? '/emotions/owo.json'
    : new URL('/emotions/owo.json', window.location.origin).toString())

// Only one retry loop may run across mounts; the pack is a global Twikoo setting.
let emotionRetryBound = false

// Shared cadence for both rotating texts: the composer placeholder and the
// empty-state message in the comments list.
const ROTATE_INTERVAL_MS = 15_000

export function Comments({
  containerId = 'twikoo-container',
  path,
  eager = false,
  layout = 'auto',
  variant = 'default',
  composerState = 'open',
  className,
  showTitle = true,
  onCommentLoaded,
}: {
  containerId?: string
  path?: string
  eager?: boolean
  layout?: 'auto' | 'stacked'
  variant?: 'default' | 'compact'
  composerState?: 'open' | 'collapsed'
  className?: string
  showTitle?: boolean
  onCommentLoaded?: () => void
} = {}) {
  const { t, i18n } = useTranslation()
  // Twikoo reads `lang` from its init options; keep it in sync with the site.
  const currentLang = i18n.resolvedLanguage || i18n.language || 'zh'
  const commentRef = useRef<HTMLElement>(null)
  const mountHostRef = useRef<HTMLDivElement>(null)
  const onCommentLoadedRef = useRef(onCommentLoaded)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [commentCount, setCommentCount] = useState(0)
  const commentCountRef = useRef(0)

  const TWIKOO_ENV_ID =
    import.meta.env.VITE_TWIKOO_ENV_ID ||
    'https://comments.markxu.icu/api/twikoo'

  const hasRenderedTwikooContent = (target: HTMLElement | null) => {
    if (!target) return false
    if (
      target.querySelector(
        '.tk-comments, .tk-comments-container, .tk-submit, .tk-login'
      )
    ) {
      return true
    }
    return false
  }

  // Does the heavy DOM work; split out so the re-entrancy guard around it is
  // a single, auditable try/finally.
  const applyCustomizationsInner = useCallback(
    (wrap: HTMLElement) => {
      // --- click-to-expand composer (JS-managed so emotion picker doesn't collapse it) ---
      // Only the top-level composer collapses; reply editors stay fully usable.
      const submit = wrap.querySelector<HTMLElement>(
        '.tk-comments > .tk-submit'
      )
      if (submit) {
        const open = () => submit.classList.add('is-open')
        const close = () => submit.classList.remove('is-open')
        if (!submit.dataset.openBound) {
          submit.dataset.openBound = 'true'
          submit.addEventListener('click', (e) => {
            e.stopPropagation()
            open()
          })
          const outside = (ev: MouseEvent) => {
            if (!submit.contains(ev.target as Node)) close()
          }
          document.addEventListener('click', outside, { capture: true })
        }
        // Keep open while an emotion panel is up.
        const isOwOOpen = () =>
          !!wrap.querySelector('.OwO-body')?.classList.contains('OwO-open')
        if (isOwOOpen()) open()
      }

      // --- remove refresh button (rarely needed) and preview/markdown hints ---
      wrap
        .querySelectorAll(
          '.tk-refresh, .tk-preview, .tk-submit-action-icon.__markdown'
        )
        .forEach((el) => {
          const parent = el.parentElement
          parent?.removeChild(el)
        })

      // --- rotating fun placeholder for the comment box (every 10s) ---
      const textarea =
        wrap.querySelector<HTMLTextAreaElement>('.tk-input textarea')
      if (textarea) {
        const lines = [
          t('comments.placeholder1', '来都来了，说点什么吧 ✨'),
          t('comments.placeholder2', '这里需要一条查重率0%的评论'),
          t('comments.placeholder3', '宫廷玉液酒，评论走一走'),
          t('comments.placeholder4', '你猜我的评论区在等谁？'),
          t('comments.placeholder5', '其实，才不是不想评论呢'),
        ]
        if (!textarea.dataset.rotatorBound) {
          textarea.dataset.rotatorBound = 'true'
          let i = 0
          textarea.placeholder = lines[0]
          const timer = window.setInterval(() => {
            // Stop once Twikoo re-rendered/replaced the composer textarea.
            if (!textarea.isConnected) {
              window.clearInterval(timer)
              return
            }
            i = (i + 1) % lines.length
            // Don't overwrite while the visitor is actively typing.
            if (!textarea.value) textarea.placeholder = lines[i]
          }, ROTATE_INTERVAL_MS)
        } else if (!textarea.value && !lines.includes(textarea.placeholder)) {
          // Twikoo rebinds the server-side COMMENT_PLACEHOLDER on re-render, so
          // restore ours whenever it gets clobbered (keeps the rotation alive).
          textarea.placeholder = lines[0]
        }
      }

      // --- normalize meta fields: short label + a consistent fill hint ---
      wrap
        .querySelectorAll<HTMLElement>('.tk-meta-input .el-input')
        .forEach((input) => {
          const pre = input.querySelector<HTMLElement>(
            '.el-input-group__prepend'
          )
          const inner =
            input.querySelector<HTMLInputElement>('.el-input__inner')
          if (!pre || !inner) return
          const label = pre.textContent?.trim() ?? ''
          // Keep the prepend labels short and identical in style (idempotent).
          const isMail = /邮箱|郵箱|mail|email/i.test(label)
          const isNick = /昵称|暱稱|nickname/i.test(label)
          const isLink = /网址|網址|website/i.test(label)
          const short = isMail
            ? t('comments.mailLabel', '邮箱')
            : isNick
              ? t('comments.nickLabel', '昵称')
              : isLink
                ? t('comments.linkLabel', '网址')
                : null
          if (short && pre.textContent !== short) pre.textContent = short
          // Restore the email fill-hint (QQ auto-avatar) that we must keep.
          const wantPlaceholder = isMail
            ? t('comments.emailHint', '必填,QQ邮箱可自动获取头像')
            : isLink
              ? t('comments.optional', '选填')
              : t('comments.required', '必填')
          if (
            inner.placeholder &&
            inner.placeholder !== wantPlaceholder &&
            (isMail || !/QQ|邮箱/i.test(inner.placeholder))
          ) {
            inner.placeholder = wantPlaceholder
          }
        })

      // --- read live comment count from Twikoo title ---
      const countEl = wrap.querySelector<HTMLElement>(
        '.tk-comments-count > span:first-child'
      )
      if (countEl) {
        const n = parseInt(countEl.textContent ?? '', 10)
        if (!Number.isNaN(n) && n !== commentCountRef.current) {
          commentCountRef.current = n
          setCommentCount(n)
        }
      }
      // Hide Twikoo's own "X 条评论" counter text (数字 + suffix) while keeping
      // the sort dropdown and refresh button next to it on the right.
      const tkCount = wrap.querySelector<HTMLElement>('.tk-comments-count')
      if (tkCount) {
        const numSpan = tkCount.querySelector(':scope > span:first-child')
        const suffixSpan = tkCount.querySelector(':scope > span:nth-child(2)')
        if (numSpan) (numSpan as HTMLElement).style.display = 'none'
        if (
          suffixSpan &&
          !suffixSpan.classList.contains('tk-comments-sort') &&
          !suffixSpan.classList.contains('tk-icon')
        ) {
          ;(suffixSpan as HTMLElement).style.display = 'none'
        }
      }

      // Diminish comment actions to just 反馈+回复; the dislike button is
      // hidden below via CSS (it is the 2nd link: 点赞, 点踩, 回复). Deleting
      // nodes here is unreliable across Twikoo rerenders, so CSS hides it.
      // (no JS node removal for action buttons)

      // --- creative rotating empty-state message ---
      const emptyEl = wrap.querySelector<HTMLElement>('.tk-comments-no')
      if (emptyEl && !emptyEl.dataset.rotatorBound) {
        const lines = [
          t('comments.empty1', '还没人评论，沙发是你的 ~'),
          t('comments.empty2', '来做第一位留言的人吧 🎈'),
          t('comments.empty3', '此刻的评论区一片宁静...'),
          t('comments.empty4', '期待你的第一条留言 🌱'),
        ]
        let i = 0
        emptyEl.dataset.rotatorBound = 'true'
        const timer = window.setInterval(() => {
          // Stop once Twikoo replaced the empty-state node (comments arrived).
          if (!emptyEl.isConnected) {
            window.clearInterval(timer)
            return
          }
          i = (i + 1) % lines.length
          emptyEl.textContent = lines[i]
        }, ROTATE_INTERVAL_MS)
      }

      // --- richer OwO emotion pack (merged default + custom groups) ---
      // Twikoo reads the pack URL from its server config; if the deployment
      // hasn't set EMOTION_CDN we point it at the pack shipped with the site.
      // Fire-and-forget with bounded retries: until the composer's Vue instance
      // is mounted the patch can't apply, and a missing pack must never block
      // or break the picker (Twikoo's built-in pack stays in that case).
      if (wrap.querySelector('.OwO') && !emotionRetryBound) {
        emotionRetryBound = true
        let tries = 0
        let confirmed = 0
        const attempt = async () => {
          tries += 1
          const applied = await applyEmotionPack(EMOTION_CDN)
          // Twikoo replaces the whole config object when its async GET_CONFIG
          // response lands, which can wipe the URL we just wrote. Keep checking
          // for a while after success so a late overwrite gets patched again.
          confirmed = applied ? confirmed + 1 : 0
          // Stop once the pack is verifiably rendered a few times in a row, or
          // give up and release the lock so a later mount can retry.
          if (confirmed >= 3 || tries >= 12) {
            window.clearInterval(retry)
            if (!applied) emotionRetryBound = false
          }
        }
        const retry = window.setInterval(() => void attempt(), 500)
        void attempt()
      }
    },
    [t]
  )

  // Runtime DOM customization for the Twikoo composer, applied idempotently
  // whenever Twikoo (re)renders. Only active for the unified 'default' layout.
  const applyCustomizations = useCallback(
    (target: HTMLElement | null) => {
      if (!target || variant !== 'default') return
      // Guard against observer-triggered re-entry from our own DOM writes.
      if (applyingCustomizations) return
      const wrap = target.closest<HTMLElement>('.twikoo-wrap')
      if (!wrap) return
      applyingCustomizations = true
      try {
        applyCustomizationsInner(wrap)
      } finally {
        applyingCustomizations = false
      }
    },
    [variant, applyCustomizationsInner]
  )

  useEffect(() => {
    onCommentLoadedRef.current = onCommentLoaded
  }, [onCommentLoaded])

  useEffect(() => {
    if (!TWIKOO_ENV_ID || window.__PRERENDER__) return

    let cancelled = false
    let fallbackTimer: number | null = null
    let initTimer: number | null = null
    let pollTimer: number | null = null
    let observer: MutationObserver | null = null
    let rafId: number | null = null
    const host = mountHostRef.current

    if (!host) return

    const markReady = () => {
      if (cancelled) return
      setStatus('ready')
    }

    const initTwikoo = async () => {
      try {
        setStatus('loading')
        await loadTwikooScript()
        const twikooApi = getTwikooApi()
        if (cancelled || !twikooApi) return

        host.replaceChildren()

        const target = document.createElement('div')
        target.id = containerId
        target.className = 'min-h-[120px]'
        host.appendChild(target)

        if (hasRenderedTwikooContent(host)) {
          markReady()
          applyCustomizations(host)
          return
        }

        if (host) {
          // Debounce with rAF: Twikoo inserts DOM node-by-node, and running a
          // full customization pass on every insertion multiplies work.
          const schedule = () => {
            if (rafId !== null) return
            rafId = window.requestAnimationFrame(() => {
              rafId = null
              if (cancelled || !hasRenderedTwikooContent(host)) return
              markReady()
              applyCustomizations(host)
            })
          }

          observer = new MutationObserver(schedule)
          observer.observe(host, {
            childList: true,
            subtree: true,
            // characterData: false — text-value churn (placeholders, counts,
            // rotating empty-state) shouldn't re-trigger applyCustomizations.
          })

          pollTimer = window.setInterval(() => {
            if (hasRenderedTwikooContent(host)) {
              markReady()
              applyCustomizations(host)
            }
          }, 250)
        }

        twikooApi.init({
          envId: TWIKOO_ENV_ID,
          el: `#${containerId}`,
          path,
          // Force Twikoo's own UI strings to follow the site language.
          // Without this Twikoo falls back to navigator.language, which shows
          // English placeholders ("Required", "Optional") in a Chinese page.
          lang: currentLang.startsWith('en') ? 'en-us' : 'zh-cn',
          onCommentLoaded: () => {
            markReady()
            applyCustomizations(host)
            onCommentLoadedRef.current?.()
          },
        })

        fallbackTimer = window.setTimeout(
          () => {
            markReady()
            applyCustomizations(host)
          },
          eager ? 1200 : 2200
        )
      } catch (error) {
        console.error('Twikoo init error:', error)
        if (!cancelled) {
          setStatus('error')
        }
      }
    }

    initTimer = window.setTimeout(() => {
      void initTwikoo()
    }, 800)

    return () => {
      cancelled = true
      observer?.disconnect()
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
        rafId = null
      }
      if (pollTimer !== null) {
        window.clearInterval(pollTimer)
      }
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer)
      }
      if (initTimer !== null) {
        window.clearTimeout(initTimer)
      }
      host.replaceChildren()
    }
  }, [
    TWIKOO_ENV_ID,
    containerId,
    eager,
    path,
    variant,
    applyCustomizations,
    currentLang,
  ])

  const statusMessage = !TWIKOO_ENV_ID
    ? null
    : status === 'error'
      ? t('comments.unavailable', '评论区加载失败，请稍后重试。')
      : t('comments.loading', '正在加载评论...')
  const shouldShowStatus = Boolean(TWIKOO_ENV_ID) && status !== 'ready'

  return (
    <section
      ref={commentRef}
      id={containerId === 'twikoo-container' ? 'twikoo' : undefined}
      className={cn('mt-12 mb-8', className)}
      data-comment-variant={variant}
    >
      {showTitle ? (
        <div className="mb-6 flex items-center gap-2">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {t('comments.title', '评论区')}
          </h3>
          {commentCount > 0 ? (
            <span
              className="text-sm font-medium text-slate-500 opacity-80 dark:text-slate-400"
              aria-label={`${commentCount}`}
            >
              {commentCount}
            </span>
          ) : null}
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
        </div>
      ) : null}

      <LinkGuard containerRef={commentRef} />

      <div
        className="twikoo-wrap"
        data-layout={layout}
        data-variant={variant}
        data-composer={composerState}
        data-status={TWIKOO_ENV_ID ? status : 'unconfigured'}
      >
        <p
          aria-live="polite"
          aria-hidden={!shouldShowStatus}
          className={
            shouldShowStatus
              ? 'mx-4 mb-3 text-sm text-slate-500 transition-opacity dark:text-slate-400'
              : 'pointer-events-none mx-4 mb-0 h-0 overflow-hidden text-sm opacity-0'
          }
        >
          {statusMessage}
        </p>
        <div ref={mountHostRef} />
        {!TWIKOO_ENV_ID ? (
          <div className="mx-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 py-12 text-slate-500 dark:border-[#2b2f36] dark:bg-[#17191c]">
            <p className="mb-2 font-medium">评论区未配置</p>
            <p className="max-w-md px-4 text-center text-sm">
              请在{' '}
              <code className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-700">
                .env
              </code>{' '}
              文件中配置{' '}
              <code className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-700">
                VITE_TWIKOO_ENV_ID
              </code>
              ， 或者在{' '}
              <code className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-700">
                src/components/Comments.tsx
              </code>{' '}
              中直接填入您的 Twikoo 环境 ID。
            </p>
          </div>
        ) : null}
      </div>

      <style>{`
        .twikoo-wrap .tk-admin-container {
            z-index: 100;
        }
        .twikoo-wrap[data-status="loading"] {
            opacity: 0.98;
        }
        .twikoo-wrap[data-status="loading"] > div {
            border-radius: 0.75rem;
            background:
              linear-gradient(90deg, rgba(148, 163, 184, 0.08), rgba(148, 163, 184, 0.14), rgba(148, 163, 184, 0.08));
            background-size: 200% 100%;
            animation: twikoo-loading-shimmer 1.2s linear infinite;
        }
        .dark .twikoo-wrap[data-status="loading"] > div {
            background:
              linear-gradient(90deg, rgba(51, 65, 85, 0.24), rgba(71, 85, 105, 0.34), rgba(51, 65, 85, 0.24));
            background-size: 200% 100%;
        }
        .twikoo-wrap[data-status="ready"] > div,
        .twikoo-wrap[data-status="error"] > div,
        .twikoo-wrap[data-status="unconfigured"] > div {
            background: transparent;
            animation: none;
        }
        .twikoo-wrap .tk-input {
            background-color: transparent !important;
        }
        .twikoo-wrap .tk-meta-input {
            background-color: transparent !important;
        }

        /* ---- Unified composer: a single gray box by default; expands on click. ---- */
        /* The composer header row: avatar sits standalone (no card), on the left. */
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit > .tk-row:first-child {
            display: flex !important;
            align-items: flex-start !important;
            gap: 0.7rem !important;
        }
        /* Only the input column is the gray box, so the avatar stays outside it. */
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-col {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            border: 1px solid rgba(148, 163, 184, 0.22) !important;
            border-radius: 0.9rem !important;
            background: rgba(148, 163, 184, 0.1) !important;
            padding: 0.45rem 0.7rem !important;
            transition:
                border-color 0.2s ease,
                background 0.2s ease;
        }
        .dark .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-col {
            border-color: rgba(71, 85, 105, 0.45) !important;
            background: rgba(71, 85, 105, 0.14) !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-avatar {
            margin-top: 0.1rem !important;
        }
        /* Textarea transparent inside the gray box. */
        .twikoo-wrap[data-variant="default"] .tk-input {
            border: 0 !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-input textarea {
            border: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
            border-radius: 0 !important;
            min-height: 2.6rem !important;
            height: 2.6rem !important;
            resize: none !important;
            transition:
                min-height 0.25s ease,
                height 0.25s ease;
        }
        .twikoo-wrap[data-variant="default"] .tk-input .el-input__count {
            display: none !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-input textarea::-webkit-resizer {
            display: none !important;
        }
        /* Closed by default: meta fields + action row (spaniks/preview/etc) hidden. */
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-meta-input,
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-row.actions,
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-preview,
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-submit-action-icon.__markdown,
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit input.tk-input-image {
            display: none !important;
        }
        /* .is-open (toggled by JS) reveals meta fields + actions. */
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit.is-open {
            border-color: rgba(148, 163, 184, 0.45) !important;
        }
        .dark .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit.is-open {
            border-color: rgba(100, 116, 139, 0.6) !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit.is-open .tk-meta-input,
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit.is-open .tk-row.actions {
            display: flex !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit.is-open textarea {
            min-height: 8rem !important;
            height: 8rem !important;
        }
        /* Clean meta inputs: hairline underlines only, no stacked cards. */
        .twikoo-wrap[data-variant="default"] .tk-meta-input {
            flex-wrap: wrap !important;
            gap: 0.9rem !important;
            margin: 0 0 0.4rem !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-meta-input .el-input {
            flex: 1 1 0 !important;
            min-width: 7rem !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-meta-input .el-input__inner {
            border: 0 !important;
            border-bottom: 1px solid rgba(148, 163, 184, 0.25) !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            padding-left: 0.1rem !important;
        }
        .dark .twikoo-wrap[data-variant="default"] .tk-meta-input .el-input__inner {
            border-bottom-color: rgba(71, 85, 105, 0.5) !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-meta-input .el-input-group__prepend {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 0.35rem !important;
            color: rgba(100, 116, 139, 0.85) !important;
            font-size: 0.8rem !important;
        }
        .dark .twikoo-wrap[data-variant="default"] .tk-meta-input .el-input-group__prepend {
            color: rgba(148, 163, 184, 0.8) !important;
        }
        /* Actions row: right-aligned, NO top divider. */
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-row.actions {
            margin-top: 0.4rem !important;
            justify-content: flex-end !important;
            align-items: center !important;
        }
        /* Comment list: separated by whitespace only (no divider bar). */
        .twikoo-wrap[data-variant="default"] .tk-comments-container {
            margin-top: 1.2rem !important;
        }
        /* Site-styled sorting dropdown (最新评论/最早/最多点赞). */
        .twikoo-wrap[data-variant="default"] .tk-sort-select {
            font-size: 0.8rem !important;
            padding: 0.3rem 0.65rem !important;
            border: 1px solid rgba(148, 163, 184, 0.25) !important;
            border-radius: 0.55rem !important;
            background: rgba(148, 163, 184, 0.08) !important;
            cursor: pointer !important;
            color: var(--text-primary, #334155) !important;
            outline: none !important;
            transition:
                border-color 0.2s ease,
                background 0.2s ease;
        }
        .dark .twikoo-wrap[data-variant="default"] .tk-sort-select {
            border-color: rgba(71, 85, 105, 0.45) !important;
            background: rgba(71, 85, 105, 0.18) !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-sort-select:hover {
            border-color: rgba(148, 163, 184, 0.5) !important;
        }
        .dark .twikoo-wrap[data-variant="default"] .tk-sort-select:hover {
            border-color: rgba(100, 116, 139, 0.7) !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-sort-select:focus {
            border-color: rgba(148, 163, 184, 0.55) !important;
        }
        
        .dark .twikoo-wrap .tk-content {
            color: #cbd5e1;
        }
        .dark .twikoo-wrap .tk-time,
        .dark .twikoo-wrap .tk-extras {
            color: #9aa4b2;
        }
        .dark .twikoo-wrap .tk-nick {
            color: #e2e8f0;
        }
        .dark .twikoo-wrap .tk-input textarea {
            color: #e2e8f0;
            background-color: #17191c;
            border-color: #2b2f36;
        }
        .dark .twikoo-wrap .tk-meta-input input {
            color: #e2e8f0;
            background-color: #17191c;
            border-color: #2b2f36;
        }
        .dark .twikoo-wrap .tk-action-icon {
            color: #9aa4b2;
        }
        .dark .twikoo-wrap .tk-submit-action-icon {
            color: #9aa4b2;
        }
        .twikoo-wrap .tk-action-icon svg,
        .twikoo-wrap .tk-submit-action-icon svg {
            width: 1em;
            height: 1em;
            display: inline-block;
            vertical-align: -0.125em;
        }
        /* Hide dislike — the 2nd action link (点赞, 点踩, 回复). */
        [data-variant="default"] .tk-action a.tk-action-link:nth-of-type(2) {
            display: none !important;
        }
        .twikoo-wrap .tk-action-icon svg path,
        .twikoo-wrap .tk-submit-action-icon svg path {
            fill: currentColor;
        }
        .twikoo-wrap .tk-avatar {
          width: 2.5rem !important;
          height: 2.5rem !important;
          min-width: 2.5rem !important;
          flex: 0 0 2.5rem !important;
          overflow: hidden !important;
          border-radius: 0.72rem !important;
        }
        .twikoo-wrap .tk-avatar img {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          border-radius: inherit !important;
          object-fit: cover !important;
        }

        .twikoo-wrap[data-layout="stacked"] .tk-meta-input {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 0.5rem !important;
        }
        .twikoo-wrap[data-layout="stacked"] .tk-meta-input .el-input,
        .twikoo-wrap[data-layout="stacked"] .tk-meta-input input,
        .twikoo-wrap[data-layout="stacked"] .tk-input textarea {
          width: 100% !important;
          max-width: 100% !important;
        }
        .twikoo-wrap[data-layout="stacked"] .tk-meta-input {
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        .twikoo-wrap[data-layout="stacked"] .tk-row {
          gap: 0.5rem !important;
        }
        .twikoo-wrap[data-layout="stacked"] .tk-row.actions {
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .twikoo-wrap[data-layout="stacked"] .tk-footer {
          display: none !important;
        }

        [data-comment-variant="compact"] > .flex:first-child {
          display: none !important;
        }
        .twikoo-wrap[data-variant="compact"] {
          font-size: 0.875rem;
        }
        .twikoo-wrap[data-variant="compact"] > div,
        .twikoo-wrap[data-variant="compact"] .tk-submit,
        .twikoo-wrap[data-variant="compact"] .tk-input,
        .twikoo-wrap[data-variant="compact"] .tk-meta-input,
        .twikoo-wrap[data-variant="compact"] .tk-comments,
        .twikoo-wrap[data-variant="compact"] .tk-comments-container {
          width: 100% !important;
          max-width: 100% !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-submit {
          margin: 0 !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-submit {
          transition:
            max-height 360ms cubic-bezier(0.33, 1, 0.68, 1),
            opacity 220ms ease,
            transform 320ms cubic-bezier(0.33, 1, 0.68, 1),
            margin 320ms ease !important;
          will-change: max-height, opacity, transform;
        }
        .twikoo-wrap[data-variant="compact"][data-composer="collapsed"] .tk-submit {
          max-height: 0 !important;
          margin: 0 !important;
          opacity: 0 !important;
          overflow: hidden !important;
          pointer-events: none !important;
          transform: translateY(-0.4rem) scale(0.985) !important;
        }
        .twikoo-wrap[data-variant="compact"][data-composer="open"] .tk-submit {
          max-height: 28rem !important;
          opacity: 1 !important;
          overflow: hidden !important;
          transform: translateY(0) scale(1) !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-meta-input {
          display: block !important;
          margin: 0 0 0.55rem !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-meta-input .el-input {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-meta-input .el-input:nth-child(n + 2) {
          display: none !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-meta-input input,
        .twikoo-wrap[data-variant="compact"] .tk-input textarea {
          border-radius: 0.9rem !important;
          border: 1px solid rgba(148, 163, 184, 0.22) !important;
          background: rgba(255, 255, 255, 0.72) !important;
          box-shadow: none !important;
        }
        .dark .twikoo-wrap[data-variant="compact"] .tk-meta-input input,
        .dark .twikoo-wrap[data-variant="compact"] .tk-input textarea {
          border-color: rgba(71, 85, 105, 0.5) !important;
          background: rgba(15, 23, 42, 0.36) !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-input textarea {
          min-height: 5rem !important;
          resize: vertical !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-row {
          margin-top: 0.55rem !important;
          gap: 0.5rem !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-row.actions {
          justify-content: flex-end !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-submit-action-icon,
        .twikoo-wrap[data-variant="compact"] .tk-action-icon,
        .twikoo-wrap[data-variant="compact"] .tk-preview,
        .twikoo-wrap[data-variant="compact"] .tk-owo-emotion,
        .twikoo-wrap[data-variant="compact"] .tk-footer,
        .twikoo-wrap[data-variant="compact"] .tk-comments-title,
        .twikoo-wrap[data-variant="compact"] .tk-extras,
        .twikoo-wrap[data-variant="compact"] .tk-time,
        .twikoo-wrap[data-variant="compact"] .tk-avatar,
        .twikoo-wrap[data-variant="compact"] .tk-replies,
        .twikoo-wrap[data-variant="compact"] .tk-reply,
        .twikoo-wrap[data-variant="compact"] .tk-like,
        .twikoo-wrap[data-variant="compact"] .tk-admin-config {
          display: none !important;
        }
        .twikoo-wrap[data-variant="compact"] .el-button {
          min-height: 2.25rem !important;
          border: 0 !important;
          border-radius: 999px !important;
          padding: 0 0.95rem !important;
          background: #ff5941 !important;
          color: #fff !important;
          font-weight: 700 !important;
          box-shadow: 0 0.6rem 1.2rem -0.9rem rgba(255, 89, 65, 0.8) !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-comments {
          margin-top: 1rem !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-comment {
          padding: 0.8rem 0 !important;
          border-top: 1px solid rgba(148, 163, 184, 0.16) !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-main {
          margin-left: 0 !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-nick {
          color: #ff5941 !important;
          font-size: 0.78rem !important;
          font-weight: 800 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-content {
          margin-top: 0.25rem !important;
          color: #475569 !important;
          font-size: 0.86rem !important;
          line-height: 1.65 !important;
        }
        .dark .twikoo-wrap[data-variant="compact"] .tk-content {
          color: #cbd5e1 !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-content p {
          margin: 0 !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-expand,
        .twikoo-wrap[data-variant="compact"] .tk-pagination {
          margin-top: 0.8rem !important;
          color: #ff5941 !important;
          font-size: 0.78rem !important;
          font-weight: 700 !important;
        }

        @keyframes twikoo-loading-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @media (max-width: 520px) {
          .twikoo-wrap {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          .twikoo-wrap .tk-comments-container {
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
          }
          .twikoo-wrap .tk-input,
          .twikoo-wrap .tk-meta-input {
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
          }
          .twikoo-wrap .tk-meta-input,
          .twikoo-wrap .tk-meta-input input,
          .twikoo-wrap .tk-input textarea {
            width: 100% !important;
            max-width: 100% !important;
          }
          .twikoo-wrap .tk-meta-input {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          .twikoo-wrap .tk-avatar {
            width: 2rem !important;
            height: 2rem !important;
            min-width: 2rem !important;
            flex-basis: 2rem !important;
            border-radius: 0.58rem !important;
          }
          .twikoo-wrap .tk-content {
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .twikoo-wrap img,
          .twikoo-wrap video {
            max-width: 100% !important;
            height: auto !important;
          }
          .twikoo-wrap[data-layout="stacked"] .tk-row.actions {
            flex-direction: column;
            align-items: stretch;
          }
          .twikoo-wrap[data-layout="stacked"] .tk-row.actions .el-button,
          .twikoo-wrap[data-layout="stacked"] .tk-row.actions a {
            width: 100% !important;
          }
        }
      `}</style>
    </section>
  )
}
