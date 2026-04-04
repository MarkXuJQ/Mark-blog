import { Outlet, useLocation } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { LeftSidebarWidget, StatsWidget } from '../components/blog/BlogWidgets'
import { BlogTocCard, BlogTocDrawer } from '../components/blog/BlogTocCard'
import { getAllPosts } from '../utils/posts'
import { cn } from '../utils/cn'
import { useToc } from '../hooks/useToc'

export function BlogLayout() {
  const { i18n, t } = useTranslation()
  const posts = getAllPosts(i18n.language)
  const { pathname, hash } = useLocation()
  const isBlogList = pathname === '/blog'
  const isBlogPost = pathname.startsWith('/blog/')
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const mainRef = useRef<HTMLElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const { toc } = useToc(
    mainRef as React.RefObject<HTMLElement>,
    pathname + hash,
    {
      trackActive: false,
    }
  )

  useEffect(() => {
    setIsMobileTocOpen(false)
  }, [pathname, hash])

  useEffect(() => {
    setIsMounted(true)
  }, [])


  // Adjusted to match the sticky header height + margin + breathing room
  // Header height (54px) + Top (24px) + MB (32px) = 110px approx, but we want it to align with main content
  // Main content starts at natural flow. Setting top too high pushes it down initially.
  // We set it to a value close to the header bottom (24+54=78) to ensure it sticks but doesn't shift down initially.
  const topClass = 'top-[86px]'

  return (
    <div ref={containerRef} className={styles.container}>
      <span id="page-top" />
      <div className={styles.layoutGrid}>
        <aside
          className={cn(
            styles.leftSidebar,
            isBlogPost && styles.leftSidebarBlogPost
          )}
        >
          <div className={cn(styles.stickyWrapper, topClass)}>
            <LeftSidebarWidget />
          </div>
        </aside>

        <main id="main-content" ref={mainRef} className={styles.mainContent}>
          <Outlet />
        </main>

        <aside
          className={cn(
            styles.rightSidebar,
            isBlogPost && styles.rightSidebarBlogPost
          )}
        >
          <div className={cn(styles.stickyWrapper, topClass)}>
            {isBlogList && <StatsWidget posts={posts} />}
            {isBlogPost && <BlogTocCard toc={toc} />}
          </div>
        </aside>
      </div>

      {isBlogPost && isMounted
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setIsMobileTocOpen((prev) => !prev)}
                className={cn(
                  'fixed bottom-6 right-6 z-[80] inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm backdrop-blur lg:hidden',
                  'transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-900'
                )}
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
                open={isMobileTocOpen}
                onClose={() => setIsMobileTocOpen(false)}
              />
            </>,
            document.body
          )
        : null}
    </div>
  )
}

const styles = {
  container: 'mx-auto w-full max-w-[1400px] px-4 flex flex-col flex-1',
  layoutGrid: 'flex justify-center gap-8 items-stretch flex-1',

  leftSidebar: 'hidden lg:block w-[280px] shrink-0',
  leftSidebarBlogPost: 'lg:hidden xl:block',
  rightSidebar: 'hidden xl:block w-[280px] shrink-0',
  rightSidebarBlogPost: 'lg:block',
  stickyWrapper:
    'sticky h-[calc(100vh-8rem)] overflow-y-auto space-y-6 pb-10 scrollbar-hide',

  mainContent:
    'flex flex-col flex-1 min-w-0 w-full max-w-[640px] md:max-w-[680px] lg:max-w-[720px] xl:max-w-[760px]',
}
