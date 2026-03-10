import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LinkGuard } from './LinkGuard'

interface TwikooStatic {
  init: (options: {
    envId: string
    el: string
    path?: string
    onCommentLoaded?: () => void
  }) => void
  getCommentsCount: (options: {
    envId: string
    urls: string[]
    includeReply?: boolean
  }) => Promise<Array<{ url: string; count: number }>>
}

// Declare Twikoo on window
declare global {
  interface Window {
    twikoo?: TwikooStatic
    __PRERENDER__?: boolean
  }
}

export function Comments({
  containerId = 'twikoo',
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
  const [shouldLoadTwikoo, setShouldLoadTwikoo] = useState(false)

  const TWIKOO_ENV_ID =
    import.meta.env.VITE_TWIKOO_ENV_ID || 'https://comments.markxu.icu/api/twikoo'

  useEffect(() => {
    if (eager) {
      setShouldLoadTwikoo(true)
      return
    }
    if (window.__PRERENDER__) return
    const target = commentRef.current
    if (!target) return

    if (!('IntersectionObserver' in window)) {
      setShouldLoadTwikoo(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoadTwikoo(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px 0px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [eager])

  useEffect(() => {
    if (!TWIKOO_ENV_ID || !shouldLoadTwikoo || window.__PRERENDER__) return

    const loadSecondScript = () => {
      try {
        if (window.twikoo && typeof window.twikoo.init === 'function') {
          window.twikoo.init({
            envId: TWIKOO_ENV_ID,
            el: `#${containerId}`,
            path,
            onCommentLoaded,
          })
        } else {
          setTimeout(loadSecondScript, 500)
        }
      } catch (e) {
        console.error('Twikoo init error:', e)
      }
    }

    const existingScript = document.getElementById('twikoo-script') as HTMLScriptElement

    if (existingScript) {
      if (window.twikoo) {
        loadSecondScript()
      } else {
        existingScript.addEventListener('load', loadSecondScript)

        const intervalId = setInterval(() => {
          if (window.twikoo) {
            loadSecondScript()
            clearInterval(intervalId)
          }
        }, 500)

        return () => {
          existingScript.removeEventListener('load', loadSecondScript)
          clearInterval(intervalId)
        }
      }
    } else {
      const cdnScript = document.createElement('script')
      cdnScript.src =
        'https://registry.npmmirror.com/twikoo/1.7.0/files/dist/twikoo.min.js'
      cdnScript.async = true
      cdnScript.id = 'twikoo-script'
      cdnScript.crossOrigin = 'anonymous'

      cdnScript.addEventListener('load', loadSecondScript)
      document.body.appendChild(cdnScript)

      return () => {
        cdnScript.removeEventListener('load', loadSecondScript)
      }
    }
  }, [TWIKOO_ENV_ID, shouldLoadTwikoo, containerId, path, onCommentLoaded])

  return (
    <section ref={commentRef} className="mt-12 mb-8">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {t('comments.title', '评论区')}
        </h3>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
      </div>

      <LinkGuard containerRef={commentRef} />

      <div className="twikoo-wrap" data-layout={layout}>
        <div id={containerId} />
        {!TWIKOO_ENV_ID ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 mx-4">
            <p className="mb-2 font-medium">评论区未配置</p>
            <p className="text-sm text-center max-w-md px-4">
              请在 <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs">.env</code> 文件中配置 <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs">VITE_TWIKOO_ENV_ID</code>，
              或者在 <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs">src/components/Comments.tsx</code> 中直接填入您的 Twikoo 环境 ID。
            </p>
          </div>
        ) : !shouldLoadTwikoo ? (
          <div className="flex justify-center py-8 text-slate-400 text-sm">
            向下滚动到评论区后自动加载...
          </div>
        ) : (
          <div className="flex justify-center py-8 text-slate-400 text-sm">
            评论加载中...
          </div>
        )}
      </div>

      <style>{`
        .twikoo-wrap .tk-admin-container {
            z-index: 100;
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
            color: #94a3b8;
        }
        .dark .twikoo-wrap .tk-nick {
            color: #e2e8f0;
        }
        .dark .twikoo-wrap .tk-input textarea {
            color: #e2e8f0;
            background-color: #1e293b;
        }
        .dark .twikoo-wrap .tk-meta-input input {
            color: #e2e8f0;
        }
        .dark .twikoo-wrap .tk-action-icon {
            color: #94a3b8;
        }
        .dark .twikoo-wrap .tk-submit-action-icon {
            color: #94a3b8;
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
