import { Outlet, useLocation } from 'react-router-dom'
import { useRef } from 'react'
import { LeftSidebarWidget, StatsWidget } from '../components/blog/BlogWidgets'
import { BlogTocCard } from '../components/blog/BlogTocCard'
import { getAllPosts } from '../utils/posts'
import { cn } from '../utils/cn'
import { useToc } from '../hooks/useToc'
import { DraggableBackToTop } from '../components/ui/DraggableBackToTop'

export function BlogLayout() {
  const posts = getAllPosts()
  const { pathname, hash } = useLocation()
  const isBlogList = pathname === '/blog'
  const isBlogPost = pathname.startsWith('/blog/')

  const mainRef = useRef<HTMLElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const { toc } = useToc(
    mainRef as React.RefObject<HTMLElement>,
    pathname + hash,
    {
      trackActive: false,
    }
  )

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
        </main>

        <aside className={styles.rightSidebar}>
          <div className={cn(styles.stickyWrapper, topClass)}>
            {isBlogList && <StatsWidget posts={posts} />}
            {isBlogPost && <BlogTocCard toc={toc} />}
          </div>
        </aside>
      </div>
      <DraggableBackToTop />
    </div>
  )
}

const styles = {
  container: 'mx-auto w-full max-w-[1400px] px-4 flex flex-col flex-1',
  layoutGrid: 'flex justify-center gap-8 items-stretch flex-1',

  leftSidebar: 'hidden lg:block w-[280px] shrink-0',
  rightSidebar: 'hidden xl:block w-[280px] shrink-0',
  stickyWrapper:
    'sticky h-[calc(100vh-8rem)] overflow-y-auto space-y-6 pb-10 scrollbar-hide',

  mainContent:
    'flex flex-col flex-1 min-w-0 w-full max-w-[640px] md:max-w-[680px] lg:max-w-[720px] xl:max-w-[760px]',
}
