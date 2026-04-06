import { Outlet, useLocation, useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { LeftSidebarWidget } from '../components/blog/BlogWidgets'
import { BlogTocCard, BlogTocDrawer } from '../components/blog/BlogTocCard'
import { BlogRelatedPosts } from '../components/blog/BlogRelatedPosts'
import { useToc } from '../hooks/useToc'
import { getAllPosts, getPostBySlug } from '../utils/posts'

export function BlogPostLayout() {
  const { t, i18n } = useTranslation()
  const { pathname, hash } = useLocation()
  const { slug } = useParams()
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const mainRef = useRef<HTMLElement | null>(null)
  const { toc } = useToc(
    mainRef as React.RefObject<HTMLElement>,
    pathname + hash,
    {
      trackActive: false,
    }
  )
  const posts = getAllPosts(i18n.language)
  const currentPost = slug
    ? getPostBySlug(slug, i18n.language, { fallback: false }) ?? null
    : null

  useEffect(() => {
    setIsMobileTocOpen(false)
  }, [pathname, hash])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className={styles.container}>
      <span id="page-top" />
      <div className={styles.layoutGrid}>
        <aside className={styles.leftSidebar}>
          <div className={styles.stickyWrapper}>
            <LeftSidebarWidget />
          </div>
        </aside>

        <main id="main-content" ref={mainRef} className={styles.mainContent}>
          <Outlet />
        </main>

        <aside className={styles.rightSidebar}>
          <div className={styles.stickyWrapper}>
            <BlogTocCard toc={toc} />
            <BlogRelatedPosts currentPost={currentPost} posts={posts} />
          </div>
        </aside>
      </div>

      {isMounted
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setIsMobileTocOpen((prev) => !prev)}
                className="fixed bottom-6 right-6 z-[80] inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm backdrop-blur transition-colors hover:bg-slate-50 lg:hidden dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-900"
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
  container: 'mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4',
  layoutGrid: 'flex flex-1 items-stretch justify-center gap-8',
  leftSidebar: 'hidden w-[280px] shrink-0 lg:hidden xl:block',
  rightSidebar: 'hidden w-[280px] shrink-0 lg:block',
  stickyWrapper:
    'sticky top-[86px] h-[calc(100vh-8rem)] space-y-6 overflow-y-auto pb-10 scrollbar-hide',
  mainContent:
    'flex w-full min-w-0 max-w-[640px] flex-1 flex-col md:max-w-[680px] lg:max-w-[720px] xl:max-w-[760px]',
}
