import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import '../../i18n'

const Comments = lazy(() =>
  import('./Comments').then((module) => ({ default: module.Comments }))
)

interface DeferredCommentsProps {
  rootMargin?: string
}

export function DeferredComments({
  rootMargin = '600px 0px',
}: DeferredCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    const target = containerRef.current
    if (!target) return

    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [rootMargin])

  return (
    <div ref={containerRef}>
      {shouldLoad ? (
        <Suspense fallback={<CommentsPlaceholder />}>
          <Comments />
        </Suspense>
      ) : (
        <CommentsPlaceholder />
      )}
    </div>
  )
}

function CommentsPlaceholder() {
  const { t } = useTranslation()

  return (
    <section className="mt-12 mb-8">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {t('comments.title')}
        </h3>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>
      <div
        id="twikoo"
        className="mx-4 flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 py-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
      >
        {t('comments.loading')}
      </div>
    </section>
  )
}
