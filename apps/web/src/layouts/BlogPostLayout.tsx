import { Outlet, useLocation, useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BlogRelatedPosts } from '@/components/blog/BlogRelatedPosts'
import { BlogTocCard, BlogTocDrawer } from '@/components/blog/BlogTocCard'
import { LeftSidebarWidget } from '@/components/blog/BlogWidgets'
import { ReaderModeToggle } from '@/components/blog/ReaderModeToggle'
import { useToc } from '@/hooks/useToc'
import { getAllPostSummaries } from '@/lib/content'
import { getPostBySlug } from '@/lib/content'
import { cn } from '@/lib/utils'

export type BlogPostOutletContext = {
  simpleMode: boolean
}

const READER_MODE_STORAGE_KEY = 'blog-reader-mode'

export function BlogPostLayout() {
  const { t, i18n } = useTranslation()
  const { pathname, hash } = useLocation()
  const { slug } = useParams()
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [simpleMode, setSimpleMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(READER_MODE_STORAGE_KEY) === 'simple'
  })

  const mainRef = useRef<HTMLElement | null>(null)
  const { toc, activeId } = useToc(
    mainRef as React.RefObject<HTMLElement>,
    pathname + hash,
    {
      trackActive: true,
      refreshKey: simpleMode,
    }
  )
  const postLanguage = resolvePostLanguage(slug, i18n.language)
  const posts = getAllPostSummaries(postLanguage)
  const currentPost = slug
    ? (getPostBySlug(slug, postLanguage, { fallback: false }) ?? null)
    : null
  const outletContext = useMemo(
    () => ({ simpleMode }) satisfies BlogPostOutletContext,
    [simpleMode]
  )

  useEffect(() => {
    setIsMobileTocOpen(false)
  }, [pathname, hash])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    document.documentElement.toggleAttribute('data-simple-reading', simpleMode)
    window.localStorage.setItem(
      READER_MODE_STORAGE_KEY,
      simpleMode ? 'simple' : 'rich'
    )

    return () => {
      document.documentElement.removeAttribute('data-simple-reading')
    }
  }, [simpleMode])

  return (
    <div className={styles.container}>
      <span id="page-top" />
      <div
        className={cn(styles.layoutGrid, simpleMode && styles.simpleLayoutGrid)}
      >
        <aside className={cn(styles.leftSidebar, simpleMode && '!hidden')}>
          <div className={styles.stickyWrapper}>
            <LeftSidebarWidget />
          </div>
        </aside>

        <main
          id="main-content"
          ref={mainRef}
          className={cn(
            styles.mainContent,
            simpleMode && styles.simpleMainContent
          )}
        >
          <Outlet context={outletContext} />
        </main>

        <aside
          className={cn(
            styles.rightSidebar,
            simpleMode && styles.simpleRightSidebar
          )}
        >
          <div
            className={cn(
              styles.stickyWrapper,
              simpleMode && styles.simpleStickyWrapper
            )}
          >
            <BlogTocCard
              toc={toc}
              activeId={activeId}
              variant={simpleMode ? 'plain' : 'card'}
            />
            {!simpleMode && (
              <BlogRelatedPosts currentPost={currentPost} posts={posts} />
            )}
          </div>
        </aside>
      </div>

      {isMounted ? (
        <>
          <ReaderModeToggle
            simpleMode={simpleMode}
            onToggle={() => setSimpleMode((prev) => !prev)}
          />

          <button
            type="button"
            onClick={() => setIsMobileTocOpen((prev) => !prev)}
            className="fixed right-6 bottom-6 z-[80] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur transition-colors hover:bg-slate-50 lg:hidden dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label={t('blog.toc.title')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M4 17q-.425 0-.712-.288T3 16t.288-.712T4 15h12q.425 0 .713.288T17 16t-.288.713T16 17zm0-4q-.425 0-.712-.288T3 12t.288-.712T4 11h12q.425 0 .713.288T17 12t-.288.713T16 13zm0-4q-.425 0-.712-.288T3 8t.288-.712T4 7h12q.425 0 .713.288T17 8t-.288.713T16 9zm16 8q-.425 0-.712-.288T19 16t.288-.712T20 15t.713.288T21 16t-.288.713T20 17m0-4q-.425 0-.712-.288T19 12t.288-.712T20 11t.713.288T21 12t-.288.713T20 13m0-4q-.425 0-.712-.288T19 8t.288-.712T20 7t.713.288T21 8t-.288.713T20 9"
              />
            </svg>
          </button>

          <BlogTocDrawer
            toc={toc}
            activeId={activeId}
            open={isMobileTocOpen}
            onClose={() => setIsMobileTocOpen(false)}
          />
        </>
      ) : null}
    </div>
  )
}

const styles = {
  container: 'mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4',
  layoutGrid: 'flex flex-1 items-stretch justify-center gap-8',
  simpleLayoutGrid: 'gap-10 xl:gap-12',
  leftSidebar: 'hidden w-[280px] shrink-0 lg:hidden xl:block',
  rightSidebar: 'hidden w-[280px] shrink-0 lg:block',
  simpleRightSidebar: 'w-[240px] xl:w-[260px]',
  stickyWrapper:
    'sticky top-[86px] h-[calc(100vh-8rem)] space-y-6 overflow-y-auto pb-10 scrollbar-hide',
  simpleStickyWrapper:
    'h-[calc(100vh-7rem)] space-y-0 overflow-y-auto rounded-none bg-transparent pb-8',
  mainContent:
    'flex w-full min-w-0 max-w-[640px] flex-1 flex-col md:max-w-[680px] lg:max-w-[720px] xl:max-w-[760px]',
  simpleMainContent:
    'max-w-[720px] md:max-w-[760px] lg:max-w-[780px] xl:max-w-[820px]',
}

function resolvePostLanguage(slug: string | undefined, fallback: string) {
  if (!slug) return fallback
  if (slug.endsWith('-cn') || hasNonAscii(slug)) return 'zh'
  if (slug.endsWith('-en')) return 'en'
  return fallback
}

function hasNonAscii(value: string) {
  return [...value].some((char) => char.charCodeAt(0) > 127)
}
