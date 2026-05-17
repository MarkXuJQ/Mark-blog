import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LeftSidebarWidget, StatsWidget } from '@/components/blog/BlogWidgets'
import { getAllPostSummaries } from '@/lib/content'

export function BlogListLayout() {
  const { i18n } = useTranslation()
  const posts = getAllPostSummaries(i18n.language)

  return (
    <div className={styles.container}>
      <span id="page-top" />
      <div className={styles.layoutGrid}>
        <aside className={styles.leftSidebar}>
          <div className={styles.stickyWrapper}>
            <LeftSidebarWidget />
          </div>
        </aside>

        <main id="main-content" className={styles.mainContent}>
          <Outlet />
        </main>

        <aside className={styles.rightSidebar}>
          <div className={styles.stickyWrapper}>
            <StatsWidget posts={posts} />
          </div>
        </aside>
      </div>
    </div>
  )
}

const styles = {
  container: 'mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4',
  layoutGrid: 'flex flex-1 items-stretch justify-center gap-8',
  leftSidebar: 'hidden w-[280px] shrink-0 lg:block',
  rightSidebar: 'hidden w-[280px] shrink-0 xl:block',
  stickyWrapper:
    'sticky top-[86px] h-[calc(100vh-8rem)] space-y-6 overflow-y-auto pb-10 scrollbar-hide',
  mainContent:
    'flex w-full min-w-0 max-w-[640px] flex-1 flex-col md:max-w-[680px] lg:max-w-[720px] xl:max-w-[760px]',
}
