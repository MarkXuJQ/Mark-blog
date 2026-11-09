import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LinkGuard } from './LinkGuard'
import {
  getTwikooApi,
  getTwikooEnvId,
  installEmotionPackInterceptor,
  installTwikooStyleGuard,
  loadTwikooScript,
  TWIKOO_LOCALE_BASE_URL,
} from '@/lib/comments/twikooLoader'
import { decorateCommentAvatars } from '@/lib/comments/commentAvatar'
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

// One document-level listener for every composer on the page. Twikoo re-creates
// the submit node on some re-renders, so binding a new listener per node used to
// leak handlers that all referenced detached elements.
const openComposers = new Set<HTMLElement>()
let composerOutsideHandlerBound = false

function ensureComposerOutsideHandler() {
  if (composerOutsideHandlerBound || typeof document === 'undefined') return
  composerOutsideHandlerBound = true
  document.addEventListener(
    'click',
    (event) => {
      for (const submit of openComposers) {
        if (!submit.isConnected) {
          openComposers.delete(submit)
          continue
        }
        if (!submit.contains(event.target as Node)) {
          submit.classList.remove('is-open')
        }
      }
    },
    { capture: true }
  )
}

/**
 * Twikoo's UI is a Vue app. Replacing children or inner text of any node Vue
 * renders detaches its anchor/comment nodes; the next patch then throws
 * "Cannot read properties of null (reading 'insertBefore')" and the app stops
 * reacting — sorting, search and the admin panel all appear dead afterwards.
 * Only ever mutate a text node's value (Vue can safely overwrite it later).
 */
function setVueText(container: Element | null, text: string) {
  if (!container) return
  const textNodes = Array.from(container.childNodes).filter(
    (node): node is Text => node.nodeType === Node.TEXT_NODE
  )
  if (textNodes.length > 0) {
    // Vue keeps a dynamic-text node plus empty anchor text nodes in some
    // slots. Write into the last non-empty one (the one Vue patches) and blank
    // the others, so an earlier pass can never leave a duplicated label.
    const target =
      textNodes
        .slice()
        .reverse()
        .find((node) => node.nodeValue?.trim()) ?? textNodes[0]
    for (const node of textNodes) {
      const value = node === target ? text : ''
      if (node.nodeValue !== value) node.nodeValue = value
    }
    return
  }
  // Twikoo 2 renders the empty state as <!--v-if--><span>没有评论</span>.
  const inner = container.querySelector(':scope > span')
  if (inner) setVueText(inner, text)
}

// Custom OwO pack shipped with the site: the stock 颜文字/Emoji/Bilibili groups
// plus alu / Heybox / weisumeng / 罗小黑, merged into public/emotions/owo.json.
// Resolved against the current origin so it works in dev, preview and prod.
const EMOTION_CDN =
  import.meta.env.VITE_TWIKOO_EMOTION_CDN ||
  (typeof window === 'undefined'
    ? '/emotions/owo.json'
    : new URL('/emotions/owo.json', window.location.origin).toString())

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

  const TWIKOO_ENV_ID = getTwikooEnvId()

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
        ensureComposerOutsideHandler()
        openComposers.add(submit)
        if (!submit.dataset.openBound) {
          submit.dataset.openBound = 'true'
          submit.addEventListener('click', (e) => {
            e.stopPropagation()
            open()
          })
        }
        // Keep open while an emotion panel is up.
        const isOwOOpen = () =>
          !!wrap.querySelector('.OwO-body')?.classList.contains('OwO-open')
        if (isOwOOpen()) open()
      }

      // --- refresh button / preview / markdown hints are hidden via CSS ---
      // These nodes belong to Twikoo's Vue app. Removing them from the DOM
      // breaks Vue's virtual-DOM bookkeeping: on the next re-render (sort,
      // refresh, search) Vue patches against a detached tree and throws
      // "Cannot read properties of null (reading 'insertBefore')", which
      // aborts the whole update — the comment list then keeps the old order
      // (sorting appears dead) or is left empty. Hiding them with CSS keeps
      // Vue's tree intact, so we only style, never mutate.
      // See the `.tk-comments-actions` rules in the component's <style> block.

      // --- tag the dislike button so CSS can hide it ---
      // Twikoo 2 renders these as <button> siblings; the order is
      // [delete (admin only)], like, dislike, reply, so dislike is always the
      // second-to-last control.
      wrap.querySelectorAll<HTMLElement>('.tk-action').forEach((action) => {
        const buttons = action.querySelectorAll<HTMLButtonElement>(
          ':scope > button.tk-action-link'
        )
        if (buttons.length < 3) return
        buttons[buttons.length - 2].dataset.tkDislike = 'true'
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

      // --- meta fields: restore our fill hints, leave the labels alone ---
      // Twikoo 2 already ships exactly the labels we want (昵称/邮箱/网址 and
      // Nickname/Email/Website). Rewriting `.tk-input-group__prepend` used to
      // produce "昵称昵称": Vue renders that slot as several text nodes, so
      // writing a short label into one of them duplicates the original.
      // Identify fields by the input's stable `name` attribute instead.
      wrap
        .querySelectorAll<HTMLElement>('.tk-meta-input .tk-input--group')
        .forEach((input) => {
          const inner =
            input.querySelector<HTMLInputElement>('.tk-input__inner')
          if (!inner) return
          const isMail = inner.name === 'mail'
          const isLink = inner.name === 'link'
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

      // --- make the management panel entry appear while the crypt is typed ---
      // Twikoo 2 checks HIDE_ADMIN_CRYPT in TkMetaInput's `onChange` handler
      // (native `change` = blur/Enter), not on `input`. After the upgrade that
      // reads as "entering the admin nickname does nothing". Mirror `input`
      // onto a debounced `change` so the cog shows as soon as the crypt matches.
      // QQ numbers are skipped: Twikoo's change handler fires GET_QQ_NICK for
      // those, and we don't want a network call on every keystroke.
      if (!wrap.dataset.adminCryptBound) {
        wrap.dataset.adminCryptBound = 'true'
        let cryptTimer: number | undefined
        wrap.addEventListener('input', (event) => {
          const input = event.target
          if (!(input instanceof HTMLInputElement) || input.name !== 'nick') {
            return
          }
          window.clearTimeout(cryptTimer)
          if (/^[1-9][0-9]{4,10}(@qq\.com)?$/i.test(input.value)) return
          cryptTimer = window.setTimeout(() => {
            if (input.isConnected) {
              input.dispatchEvent(new Event('change', { bubbles: true }))
            }
          }, 250)
        })
      }

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
      // the sort buttons and refresh button next to it on the right.
      // Twikoo 2 renders both parts inside `.tk-comments-count`, and moved the
      // controls into the sibling `.tk-comments-actions`.
      // The counter is hidden with CSS (see the <style> block below) rather than
      // by mutating inline styles, so we never touch nodes Vue owns.

      // Diminish comment actions to just 反馈+回复; the dislike button is
      // hidden below via CSS (it is the 2nd link: 点赞, 点踩, 回复). Deleting
      // nodes here is unreliable across Twikoo rerenders, so CSS hides it.
      // (no JS node removal for action buttons)

      // --- creative rotating empty-state message ---
      const emptyEl = wrap.querySelector<HTMLElement>('.tk-comments-no')
      if (emptyEl) {
        const lines = [
          t('comments.empty1', '还没人评论，沙发是你的 ~'),
          t('comments.empty2', '来做第一位留言的人吧 🎈'),
          t('comments.empty3', '此刻的评论区一片宁静...'),
          t('comments.empty4', '期待你的第一条留言 🌱'),
        ]
        if (!emptyEl.dataset.rotatorBound) {
          let i = 0
          emptyEl.dataset.rotatorBound = 'true'
          emptyEl.dataset.rotatorText = lines[0]
          // Show a friendly line right away instead of Twikoo's bare
          // "没有评论" for the first 15 seconds.
          setVueText(emptyEl, lines[0])
          const timer = window.setInterval(() => {
            // Stop once Twikoo replaced the empty-state node (comments arrived).
            if (!emptyEl.isConnected) {
              window.clearInterval(timer)
              return
            }
            i = (i + 1) % lines.length
            emptyEl.dataset.rotatorText = lines[i]
            // Never replace the container's children: Vue keeps anchor comment
            // nodes in there and needs them on the next patch.
            setVueText(emptyEl, lines[i])
          }, ROTATE_INTERVAL_MS)
        } else if (
          emptyEl.dataset.rotatorText &&
          emptyEl.textContent?.trim() !== emptyEl.dataset.rotatorText
        ) {
          // Twikoo re-rendered the node back to its default text; restore ours.
          setVueText(emptyEl, emptyEl.dataset.rotatorText)
        }
      }
    },
    [t]
  )

  // Runtime DOM customization for the Twikoo composer, applied idempotently
  // whenever Twikoo (re)renders. Only active for the unified 'default' layout.
  const applyCustomizations = useCallback(
    (target: HTMLElement | null) => {
      if (!target) return
      const wrap = target.closest<HTMLElement>('.twikoo-wrap')
      if (!wrap) return

      // Avatars are swapped for every variant: the compact layout hides them,
      // but the same nodes can be reused when Twikoo re-renders.
      void decorateCommentAvatars(wrap).catch((error) => {
        console.error('Comment avatar decoration failed:', error)
      })

      if (variant !== 'default') return
      // Guard against observer-triggered re-entry from our own DOM writes.
      if (applyingCustomizations) return
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

  // Keep the DOM customizer fresh without making the Twikoo init effect depend
  // on `t` (whose identity changes whenever i18next re-binds). Re-running that
  // effect tears down the mounted Vue app and is what made the comment area
  // blink away on the first visit and come back only after a page refresh.
  const applyCustomizationsRef = useRef(applyCustomizations)
  useEffect(() => {
    applyCustomizationsRef.current = applyCustomizations
  }, [applyCustomizations])

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

    /**
     * Whether Twikoo has actually rendered the comment list (or an explicit
     * empty state) — as opposed to just having mounted its shell.
     *
     * The composer renders immediately, so "Twikoo is on the page" is not the
     * same as "the comments are here". Marking the section ready on the shell
     * hides the loading hint while the list is still empty, which looks like
     * the comments vanished.
     */
    const hasCommentList = () => {
      if (!host) return false
      return (
        host.querySelector('.tk-comment') !== null ||
        host.querySelector('.tk-comments-no') !== null ||
        host.querySelector('.tk-error') !== null
      )
    }

    // Arm the emotion-pack interceptor immediately: it is synchronous now and
    // fetches the pack in the background, so mounting Twikoo does not wait on
    // that (large) JSON. The comment list itself never depends on it.
    installEmotionPackInterceptor(EMOTION_CDN)
    // Twikoo injects a *global* Prism theme <link> when code highlighting is
    // enabled. Drop it so it cannot restyle the article's code blocks.
    installTwikooStyleGuard()

    let initAttempts = 0

    // Tear down only the bookkeeping around one mount attempt. Importantly we
    // do NOT clear `host` here: clearing it in the effect cleanup is what made
    // the whole comment section blink away whenever the effect re-ran.
    const teardownRuntime = () => {
      observer?.disconnect()
      observer = null
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
        rafId = null
      }
      if (pollTimer !== null) {
        window.clearInterval(pollTimer)
        pollTimer = null
      }
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer)
        fallbackTimer = null
      }
    }

    const initTwikoo = async () => {
      try {
        teardownRuntime()
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
          // The list may already be there (e.g. a remount onto a cached
          // render); otherwise the observer below keeps checking.
          if (hasCommentList()) markReady()
          applyCustomizationsRef.current(host)
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
              // Only drop the loading state once the list itself is there, so
              // the section never looks empty while the request is in flight.
              if (hasCommentList()) markReady()
              applyCustomizationsRef.current(host)
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
              if (hasCommentList()) markReady()
              applyCustomizationsRef.current(host)
            }
          }, 250)
        }

        // `init` is async in Twikoo 2. An unhandled rejection there used to
        // leave the section stuck on "loading" with no visible explanation.
        const initResult = twikooApi.init({
          envId: TWIKOO_ENV_ID,
          el: `#${containerId}`,
          path,
          // Force Twikoo's own UI strings to follow the site language.
          // Without this Twikoo falls back to navigator.language, which shows
          // English placeholders ("Required", "Optional") in a Chinese page.
          lang: currentLang.startsWith('en') ? 'en-us' : 'zh-cn',
          // Twikoo 2 loads UI strings lazily from `<script dir>/locales/<lang>.js`.
          // Pin it explicitly: the script is injected from JS, so `currentScript`
          // inference is not always reliable once the loader has moved on.
          localeBaseUrl: TWIKOO_LOCALE_BASE_URL,
          onCommentLoaded: () => {
            // Twikoo calls this once the list has been fetched and rendered.
            markReady()
            applyCustomizationsRef.current(host)
            onCommentLoadedRef.current?.()
          },
        })
        if (initResult && typeof initResult.catch === 'function') {
          void initResult.catch((error: unknown) => {
            console.error('Twikoo init rejected:', error)
            if (!cancelled) setStatus('error')
          })
        }

        // Safety net. A cold serverless backend can answer GET_CONFIG so late
        // that Twikoo mounts its shell but never renders the list; a manual
        // page refresh fixes it because init runs again. Do that automatically
        // once instead of leaving an empty section on the very first visit.
        fallbackTimer = window.setTimeout(() => {
          if (cancelled) return
          if (hasCommentList()) {
            markReady()
            applyCustomizationsRef.current(host)
            return
          }
          if (initAttempts < 1 && !host.querySelector('.tk-error')) {
            initAttempts += 1
            void initTwikoo()
            return
          }
          setStatus('error')
        }, eager ? 7000 : 10000)
      } catch (error) {
        console.error('Twikoo init error:', error)
        if (!cancelled) {
          setStatus('error')
        }
      }
    }

    // Start as soon as the browser is idle instead of a fixed delay: the
    // component only mounts when the reader is already near the comments.
    initTimer = window.setTimeout(() => {
      void initTwikoo()
    }, 0)

    return () => {
      cancelled = true
      teardownRuntime()
      if (initTimer !== null) {
        window.clearTimeout(initTimer)
      }
      // Deliberately keep `host`'s children. React may re-run this effect (or
      // unmount/remount under StrictMode); wiping the mounted Vue tree here is
      // what made the comment area disappear until a full page refresh.
    }
  }, [
    TWIKOO_ENV_ID,
    containerId,
    eager,
    path,
    variant,
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
        /* Collapsed: center the avatar and the placeholder on the SAME baseline.
           Twikoo's default flex-start puts the 2.5rem avatar at the top of a
           taller input box, while the textarea placeholder hugs its own top
           padding — the two end up ~8px apart and look crooked. */
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit > .tk-row:first-child {
            display: flex !important;
            align-items: center !important;
            gap: 0.7rem !important;
        }
        /* Expanded editor: the avatar goes back to the top of the tall textarea. */
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit.is-open > .tk-row:first-child {
            align-items: flex-start !important;
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
            margin-top: 0 !important;
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
            /* A single line with line-height == height is vertically centered,
               so the placeholder shares the avatar's center line. */
            line-height: 2.6rem !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            resize: none !important;
            transition:
                min-height 0.25s ease,
                height 0.25s ease;
        }
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit.is-open .tk-input textarea {
            line-height: 1.6 !important;
            padding-top: 0.4rem !important;
            padding-bottom: 0.4rem !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-input .tk-input__count {
            display: none !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-input textarea::-webkit-resizer {
            display: none !important;
        }
        /* Closed by default: meta fields + action row hidden. The preview
           button lives in the action row and comes back once the composer
           expands (Twikoo 2 renders it as .tk-preview). */
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-meta-input,
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-row.actions,
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-submit-action-icon.__markdown,
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit input.tk-input-image {
            display: none !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-preview {
            border: 1px solid rgba(148, 163, 184, 0.28) !important;
            border-radius: 0.55rem !important;
            background: rgba(148, 163, 184, 0.08) !important;
            color: rgba(100, 116, 139, 0.95) !important;
            font-size: 0.8rem !important;
        }
        .dark .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-preview {
            border-color: rgba(71, 85, 105, 0.5) !important;
            background: rgba(71, 85, 105, 0.16) !important;
            color: rgba(148, 163, 184, 0.9) !important;
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
        .twikoo-wrap[data-variant="default"] .tk-meta-input .tk-input--group {
            flex: 1 1 0 !important;
            min-width: 7rem !important;
            margin-left: 0 !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-meta-input .tk-input__inner {
            border: 0 !important;
            border-bottom: 1px solid rgba(148, 163, 184, 0.25) !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            padding-left: 0.1rem !important;
        }
        .dark .twikoo-wrap[data-variant="default"] .tk-meta-input .tk-input__inner {
            border-bottom-color: rgba(71, 85, 105, 0.5) !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-meta-input .tk-input-group__prepend {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 0.35rem !important;
            color: rgba(100, 116, 139, 0.85) !important;
            font-size: 0.8rem !important;
        }
        .dark .twikoo-wrap[data-variant="default"] .tk-meta-input .tk-input-group__prepend {
            color: rgba(148, 163, 184, 0.8) !important;
        }
        /* Actions row: right-aligned, NO top divider. Twikoo 2 indents this row
           by 3.5rem to clear the avatar column, which the merged composer here
           does not need. */
        .twikoo-wrap[data-variant="default"] .tk-comments > .tk-submit .tk-row.actions {
            margin-top: 0.4rem !important;
            margin-left: 0 !important;
            margin-bottom: 0 !important;
            justify-content: flex-end !important;
            align-items: center !important;
        }
        /* Comment search box (new in Twikoo 2): keep it, but quiet. */
        .twikoo-wrap[data-variant="default"] .tk-comments-search {
            margin-bottom: 0.9rem !important;
            gap: 0.4rem !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-comments-search .tk-input__inner {
            height: 2.1rem !important;
            font-size: 0.8rem !important;
            border-radius: 0.55rem !important;
            border-color: rgba(148, 163, 184, 0.25) !important;
            background: rgba(148, 163, 184, 0.08) !important;
        }
        .dark .twikoo-wrap[data-variant="default"] .tk-comments-search .tk-input__inner {
            border-color: rgba(71, 85, 105, 0.45) !important;
            background: rgba(71, 85, 105, 0.18) !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-comments-search .tk-button {
            height: 2.1rem !important;
            padding: 0 0.85rem !important;
            border-radius: 0.55rem !important;
            font-size: 0.8rem !important;
        }
        /* Comment list: separated by whitespace only (no divider bar). */
        .twikoo-wrap[data-variant="default"] .tk-comments-container {
            margin-top: 1.2rem !important;
        }
        /* ---- Hide Twikoo's own chrome with CSS, never by removing nodes. ----
           The comment UI is a Vue app. Detaching its nodes from the DOM (the
           refresh button, the preview/markdown hints, the "X 条评论" counter)
           leaves Vue's virtual DOM pointing at a detached tree. On the next
           re-render (sorting, refresh, search) Vue patches against that tree
           and throws "Cannot read properties of null (reading 'insertBefore')",
           which aborts the whole update: the list keeps the old order (so
           最新/最早/热门 appear to do nothing) and the list can end up empty.
           Hiding the nodes with CSS keeps Vue's tree intact. */
        .twikoo-wrap .tk-comments-count {
            display: none !important;
        }
        /* The toolbar holds [sort, search, refresh, admin]. The refresh
           control is identified by its icon's SVG path (Twikoo renders the
           icons as bare <span class="tk-icon __comments"> with no label), so
           it can be hidden without relying on child positions, which shift
           when the search box is open. */
        .twikoo-wrap .tk-comments-actions > .tk-icon.__comments > svg > path[d^='M65.9 228.5C79.2 135.5'] {
            display: none !important;
        }
        .twikoo-wrap .tk-comments-actions > .tk-icon.__comments:has(
            svg > path[d^='M65.9 228.5C79.2 135.5']
        ) {
            display: none !important;
        }
        /* Only the markdown hint icon is hidden; the preview BUTTON stays. */
        .twikoo-wrap .tk-submit-action-icon.__markdown {
            display: none !important;
        }
        /* Site-styled sorting (最新/最早/热门). Twikoo 2 replaced the <select>
           with a row of text buttons and moved them into .tk-comments-actions. */
        .twikoo-wrap[data-variant="default"] .tk-comments-sort {
            gap: 0.15rem !important;
            padding: 0.18rem !important;
            border: 1px solid rgba(148, 163, 184, 0.25) !important;
            border-radius: 0.55rem !important;
            background: rgba(148, 163, 184, 0.08) !important;
        }
        .dark .twikoo-wrap[data-variant="default"] .tk-comments-sort {
            border-color: rgba(71, 85, 105, 0.45) !important;
            background: rgba(71, 85, 105, 0.18) !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-sort-item {
            padding: 0.28rem 0.6rem !important;
            border-radius: 0.42rem !important;
            font-size: 0.8rem !important;
            font-weight: 500 !important;
            color: rgba(100, 116, 139, 0.85) !important;
            transition:
                color 0.2s ease,
                background 0.2s ease;
        }
        .dark .twikoo-wrap[data-variant="default"] .tk-sort-item {
            color: rgba(148, 163, 184, 0.8) !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-sort-item:hover {
            color: var(--text-primary, #334155) !important;
            background: rgba(148, 163, 184, 0.14) !important;
        }
        .twikoo-wrap[data-variant="default"] .tk-sort-item.__active {
            color: #ff5941 !important;
            background: rgba(255, 89, 65, 0.12) !important;
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
        /* Hide dislike — tagged in JS as the 2nd-to-last action button. */
        .twikoo-wrap .tk-action > button.tk-action-link[data-tk-dislike='true'] {
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
        /* Generated avatars (boring-avatars) for visitors without a real one. */
        .twikoo-wrap .tk-avatar img[data-boring-avatar-hidden='true'] {
          display: none !important;
        }
        .twikoo-wrap .tk-avatar > svg[data-boring-avatar] {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
        }
        /* Hold the placeholder back until the "does this person have a real
           avatar?" probe resolves, so a rebohash never flashes on screen. */
        .twikoo-wrap .tk-avatar[data-avatar-state='pending'] > img {
          opacity: 0 !important;
        }
        .twikoo-wrap .tk-avatar {
          transition: opacity 0.2s ease;
        }

        .twikoo-wrap[data-layout="stacked"] .tk-meta-input {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 0.5rem !important;
        }
        .twikoo-wrap[data-layout="stacked"] .tk-meta-input .tk-input--group,
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
        .twikoo-wrap[data-variant="compact"] .tk-meta-input .tk-input--group {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
        }
        .twikoo-wrap[data-variant="compact"] .tk-meta-input .tk-input--group:nth-child(n + 2) {
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
        .twikoo-wrap[data-variant="compact"] .tk-button {
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

        /* ---- Code blocks inside comments, scoped to the comment widget. ----
           Twikoo 2 injects a *global* Prism theme <link> (installTwikooStyleGuard
           removes it, since its unscoped pre[class*=language-]/.token rules used
           to restyle every code block on the host page). These rules restore
           highlighting for comment code only. */
        .twikoo-wrap .tk-content,
        .twikoo-wrap .tk-preview-container {
            --tk-code-bg: #f6f8fa;
            --tk-code-fg: #334155;
            --tk-code-comment: #6a737d;
            --tk-code-keyword: #d73a49;
            --tk-code-string: #032f62;
            --tk-code-number: #005cc5;
            --tk-code-function: #6f42c1;
            --tk-code-operator: #d73a49;
        }
        .dark .twikoo-wrap .tk-content,
        .dark .twikoo-wrap .tk-preview-container {
            --tk-code-bg: #0f172a;
            --tk-code-fg: #c9d1d9;
            --tk-code-comment: #8b98a5;
            --tk-code-keyword: #cc99cc;
            --tk-code-string: #99cc99;
            --tk-code-number: #f99157;
            --tk-code-function: #6699cc;
            --tk-code-operator: #66cccc;
        }
        .twikoo-wrap .tk-content pre,
        .twikoo-wrap .tk-preview-container pre {
            margin: 0.7em 0 !important;
            padding: 0.85em 1em !important;
            border: 1px solid rgba(148, 163, 184, 0.18) !important;
            border-radius: 0.5rem !important;
            background: var(--tk-code-bg) !important;
            color: var(--tk-code-fg) !important;
            font-size: 0.84rem !important;
            line-height: 1.65 !important;
            tab-size: 2 !important;
            max-width: 100% !important;
            overflow-x: auto !important;
        }
        .twikoo-wrap .tk-content pre code,
        .twikoo-wrap .tk-preview-container pre code {
            display: block !important;
            padding: 0 !important;
            background: transparent !important;
            color: inherit !important;
            text-shadow: none !important;
            white-space: pre !important;
            font-family: var(--font-code, ui-monospace, SFMono-Regular, Menlo, monospace) !important;
        }
        .twikoo-wrap .tk-content :not(pre) > code,
        .twikoo-wrap .tk-preview-container :not(pre) > code {
            padding: 0.12em 0.35em !important;
            border-radius: 0.3rem !important;
            background: rgba(148, 163, 184, 0.16) !important;
            color: var(--tk-code-fg) !important;
            font-size: 0.88em !important;
        }
        .twikoo-wrap .tk-content .token.comment,
        .twikoo-wrap .tk-content .token.prolog,
        .twikoo-wrap .tk-content .token.doctype,
        .twikoo-wrap .tk-content .token.cdata,
        .twikoo-wrap .tk-preview-container .token.comment,
        .twikoo-wrap .tk-preview-container .token.prolog,
        .twikoo-wrap .tk-preview-container .token.doctype,
        .twikoo-wrap .tk-preview-container .token.cdata {
            color: var(--tk-code-comment) !important;
        }
        .twikoo-wrap .tk-content .token.punctuation,
        .twikoo-wrap .tk-preview-container .token.punctuation {
            color: var(--tk-code-fg) !important;
            opacity: 0.8 !important;
        }
        .twikoo-wrap .tk-content .token.property,
        .twikoo-wrap .tk-content .token.tag,
        .twikoo-wrap .tk-content .token.constant,
        .twikoo-wrap .tk-content .token.symbol,
        .twikoo-wrap .tk-content .token.deleted,
        .twikoo-wrap .tk-content .token.atrule,
        .twikoo-wrap .tk-content .token.keyword,
        .twikoo-wrap .tk-preview-container .token.property,
        .twikoo-wrap .tk-preview-container .token.tag,
        .twikoo-wrap .tk-preview-container .token.constant,
        .twikoo-wrap .tk-preview-container .token.symbol,
        .twikoo-wrap .tk-preview-container .token.deleted,
        .twikoo-wrap .tk-preview-container .token.atrule,
        .twikoo-wrap .tk-preview-container .token.keyword {
            color: var(--tk-code-keyword) !important;
        }
        .twikoo-wrap .tk-content .token.selector,
        .twikoo-wrap .tk-content .token.attr-name,
        .twikoo-wrap .tk-content .token.string,
        .twikoo-wrap .tk-content .token.char,
        .twikoo-wrap .tk-content .token.builtin,
        .twikoo-wrap .tk-content .token.inserted,
        .twikoo-wrap .tk-content .token.attr-value,
        .twikoo-wrap .tk-preview-container .token.selector,
        .twikoo-wrap .tk-preview-container .token.attr-name,
        .twikoo-wrap .tk-preview-container .token.string,
        .twikoo-wrap .tk-preview-container .token.char,
        .twikoo-wrap .tk-preview-container .token.builtin,
        .twikoo-wrap .tk-preview-container .token.inserted,
        .twikoo-wrap .tk-preview-container .token.attr-value {
            color: var(--tk-code-string) !important;
        }
        .twikoo-wrap .tk-content .token.boolean,
        .twikoo-wrap .tk-content .token.number,
        .twikoo-wrap .tk-content .token.regex,
        .twikoo-wrap .tk-content .token.important,
        .twikoo-wrap .tk-preview-container .token.boolean,
        .twikoo-wrap .tk-preview-container .token.number,
        .twikoo-wrap .tk-preview-container .token.regex,
        .twikoo-wrap .tk-preview-container .token.important {
            color: var(--tk-code-number) !important;
        }
        .twikoo-wrap .tk-content .token.function,
        .twikoo-wrap .tk-content .token.class-name,
        .twikoo-wrap .tk-preview-container .token.function,
        .twikoo-wrap .tk-preview-container .token.class-name {
            color: var(--tk-code-function) !important;
        }
        .twikoo-wrap .tk-content .token.operator,
        .twikoo-wrap .tk-content .token.entity,
        .twikoo-wrap .tk-content .token.url,
        .twikoo-wrap .tk-content .token.variable,
        .twikoo-wrap .tk-preview-container .token.operator,
        .twikoo-wrap .tk-preview-container .token.entity,
        .twikoo-wrap .tk-preview-container .token.url,
        .twikoo-wrap .tk-preview-container .token.variable {
            color: var(--tk-code-operator) !important;
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
          .twikoo-wrap[data-layout="stacked"] .tk-row.actions .tk-button,
          .twikoo-wrap[data-layout="stacked"] .tk-row.actions a {
            width: 100% !important;
          }
        }
      `}</style>
    </section>
  )
}
