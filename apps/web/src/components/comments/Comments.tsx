import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LinkGuard } from './LinkGuard'
import { getTwikooApi, loadTwikooScript } from './twikooLoader'

// Declare Twikoo on window
declare global {
  interface Window {
    __PRERENDER__?: boolean
  }
}

export function Comments({
  containerId = 'twikoo-container',
  path,
  eager = false,
  layout = 'auto',
  onCommentLoaded,
}: {
  containerId?: string
  path?: string
  eager?: boolean
  layout?: 'auto' | 'stacked'
  onCommentLoaded?: () => void
} = {}) {
  const { t } = useTranslation()
  const commentRef = useRef<HTMLElement>(null)
  const mountHostRef = useRef<HTMLDivElement>(null)
  const onCommentLoadedRef = useRef(onCommentLoaded)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const TWIKOO_ENV_ID =
    import.meta.env.VITE_TWIKOO_ENV_ID || 'https://comments.markxu.icu/api/twikoo'

  const hasRenderedTwikooContent = (target: HTMLElement | null) => {
    if (!target) return false
    if (target.querySelector('.tk-comments, .tk-comments-container, .tk-submit, .tk-login')) {
      return true
    }
    return false
  }

  useEffect(() => {
    onCommentLoadedRef.current = onCommentLoaded
  }, [onCommentLoaded])

  useEffect(() => {
    if (!TWIKOO_ENV_ID || window.__PRERENDER__) return

    let cancelled = false
    let fallbackTimer: number | null = null
    let pollTimer: number | null = null
    let observer: MutationObserver | null = null
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
          return
        }

        if (host) {
          observer = new MutationObserver(() => {
            if (hasRenderedTwikooContent(host)) {
              markReady()
            }
          })
          observer.observe(host, {
            childList: true,
            subtree: true,
            characterData: true,
          })

          pollTimer = window.setInterval(() => {
            if (hasRenderedTwikooContent(host)) {
              markReady()
            }
          }, 250)
        }

        twikooApi.init({
          envId: TWIKOO_ENV_ID,
          el: `#${containerId}`,
          path,
          onCommentLoaded: () => {
            markReady()
            onCommentLoadedRef.current?.()
          },
        })

        fallbackTimer = window.setTimeout(markReady, eager ? 1200 : 2200)
      } catch (error) {
        console.error('Twikoo init error:', error)
        if (!cancelled) {
          setStatus('error')
        }
      }
    }

    void initTwikoo()

    return () => {
      cancelled = true
      observer?.disconnect()
      if (pollTimer !== null) {
        window.clearInterval(pollTimer)
      }
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer)
      }
      host.replaceChildren()
    }
  }, [TWIKOO_ENV_ID, containerId, eager, path])

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
      className="mt-12 mb-8"
    >
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {t('comments.title', '评论区')}
        </h3>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
      </div>

      <LinkGuard containerRef={commentRef} />

      <div
        className="twikoo-wrap"
        data-layout={layout}
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
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-50 dark:bg-[#17191c] rounded-lg border border-dashed border-slate-300 dark:border-[#2b2f36] mx-4">
            <p className="mb-2 font-medium">评论区未配置</p>
            <p className="text-sm text-center max-w-md px-4">
              请在 <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs">.env</code> 文件中配置 <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs">VITE_TWIKOO_ENV_ID</code>，
              或者在 <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs">src/components/Comments.tsx</code> 中直接填入您的 Twikoo 环境 ID。
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
        .twikoo-wrap .tk-action-icon svg path,
        .twikoo-wrap .tk-submit-action-icon svg path {
            fill: currentColor;
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
