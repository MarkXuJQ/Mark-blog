import { Outlet, useLocation } from 'react-router-dom'
import { useRef } from 'react'
import { Card } from '../components/ui/Card'
import { LeftSidebarWidget, StatsWidget } from '../components/blog/BlogWidgets'
import { TocList } from '../components/blog/TocList'
import { Footer } from '../components/layout/Footer'
import { getAllPosts } from '../utils/posts'
import { cn } from '../utils/cn'
import { useToc } from '../hooks/useToc'
import { useScrollToTop } from '../hooks/useScrollToTop'
import { ArrowUpCircle, MessageSquareText } from 'lucide-react'
import { IoArrowUpSharp } from "react-icons/io5";

export function BlogLayout() {
  const posts = getAllPosts()
  const { pathname } = useLocation()
  const isBlogList = pathname === '/blog'
  const isBlogPost = pathname.startsWith('/blog/')
  
  const mainRef = useRef<HTMLElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  
  const { toc, activeId } = useToc(mainRef as React.RefObject<HTMLElement>, pathname)
  const { showTopBtn, scrollToTop } = useScrollToTop()
  
  // Adjusted to match the sticky header height + margin + breathing room
  // Header height (54px) + Top (24px) + MB (32px) = 110px approx, but we want it to align with main content
  // Main content starts at natural flow. Setting top too high pushes it down initially.
  // We set it to a value close to the header bottom (24+54=78) to ensure it sticks but doesn't shift down initially.
  const topClass = 'top-[86px]'

  return (
    <div ref={containerRef} className={styles.container}>
      <span id="page-top" />
      <div className={styles.layoutGrid}>
        <aside className={styles.leftSidebar}>
          <div className={cn(styles.stickyWrapper, topClass)}>
            <LeftSidebarWidget />
          </div>
        </aside>

        <main id="main-content" ref={mainRef} className={styles.mainContent}>
          <Outlet />
          <div className="mt-auto w-full px-4 pb-8 pt-8 relative z-20">
            <Footer />
          </div>
        </main>

        <aside className={styles.rightSidebar}>
          <div className={cn(styles.stickyWrapper, topClass)}>
            {isBlogList && <StatsWidget posts={posts} />}
            {isBlogPost && (
              <Card className={styles.tocCard}>
                <div className={styles.tocHeader}>
                  <span>目录</span>
                  <div className={styles.tocActions}>
                    <a
                      href="#page-top"
                      aria-label="返回开头"
                      className={styles.tocActionLink}
                      onClick={(e) => {
                        e.preventDefault()
                        scrollToTop()
                      }}
                    >
                      <ArrowUpCircle size={18} />
                    </a>
                    <a href="#twikoo" aria-label="评论区" className={styles.tocActionLink}>
                      <MessageSquareText size={18} />
                    </a>
                  </div>
                </div>
                <div className={styles.tocBody}>
                  <div className={styles.tocList}>
                  {toc.length === 0 ? (
                    <div className={styles.tocItem}>暂无标题</div>
                  ) : (
                    <TocList toc={toc} activeId={activeId} />
                  )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </aside>
      </div>
      <a
        href="#page-top"
        aria-label="返回顶部"
        className={cn(styles.backToTopFixed, showTopBtn ? styles.backToTopVisible : styles.backToTopHidden)}
        onClick={(e) => {
          e.preventDefault()
          scrollToTop()
        }}
      >
        <IoArrowUpSharp size={20} />
      </a>
    </div>
  )
}

const styles = {
  container: "mx-auto w-full max-w-[1400px] px-4 flex flex-col flex-1",
  layoutGrid: "flex justify-center gap-8 items-stretch flex-1",

  leftSidebar: "hidden lg:block w-[280px] shrink-0",
  rightSidebar: "hidden xl:block w-[280px] shrink-0",
  stickyWrapper: "sticky h-[calc(100vh-8rem)] overflow-y-auto space-y-6 pb-10 scrollbar-hide",

  mainContent: "flex flex-col flex-1 min-w-0 w-full max-w-[640px] md:max-w-[680px] lg:max-w-[720px] xl:max-w-[760px]",

  tocCard: cn("p-4"),
  tocHeader: cn(
    "mb-3 flex items-center justify-between gap-2 text-sm font-semibold text-slate-600",
    "dark:text-slate-300"
  ),
  tocActions: "flex items-center gap-2 text-slate-400 dark:text-slate-500",
  tocActionLink: "transition-colors hover:text-slate-700 dark:hover:text-slate-300",
  tocBody: cn(
    "relative pl-3",
    "before:content-[''] before:absolute before:inset-1 before:w-[3px] before:rounded-full before:bg-slate-100",
    "dark:before:bg-slate-800"
  ),
  tocList: "space-y-2",
  // tocItem and tocItemActive moved to TocList component
  tocItem: cn(
    "relative block overflow-hidden rounded-md px-2 py-1 text-sm truncate",
    "text-slate-700 hover:text-blue-600 cursor-pointer transition-colors",
    "dark:text-slate-300 dark:hover:text-blue-400"
  ),
  backToTopFixed: cn(
    "fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center",
    "rounded-md border border-slate-200 bg-white/90 text-slate-600 shadow-sm backdrop-blur",
    "transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300"
  ),
  backToTopHidden: "opacity-0 pointer-events-none translate-y-2 transition-opacity",
  backToTopVisible: "opacity-100 translate-y-0 transition-opacity",
}
