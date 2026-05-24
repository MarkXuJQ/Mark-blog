import { Outlet } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LeftSidebarWidget, StatsWidget } from '@/components/blog/BlogWidgets'
import { MobileBlogDrawer } from '@/components/blog/MobileBlogDrawer'
import { ReaderModeToggle } from '@/components/blog/ReaderModeToggle'
import { getAllPostSummaries } from '@/lib/content'
import { cn } from '@/lib/utils'

export type BlogListOutletContext = {
  simpleMode: boolean
}

const READER_MODE_STORAGE_KEY = 'blog-reader-mode'

export function BlogListLayout() {
  const { i18n } = useTranslation()
  const posts = getAllPostSummaries(i18n.language)
  const [isMounted, setIsMounted] = useState(false)
  const [simpleMode, setSimpleMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(READER_MODE_STORAGE_KEY) === 'simple'
  })
  const outletContext = useMemo(
    () => ({ simpleMode }) satisfies BlogListOutletContext,
    [simpleMode]
  )

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
          className={cn(
            styles.mainContent,
            simpleMode && styles.simpleMainContent
          )}
        >
          <Outlet context={outletContext} />
        </main>

        <aside className={cn(styles.rightSidebar, simpleMode && '!hidden')}>
          <div className={styles.stickyWrapper}>
            <StatsWidget posts={posts} />
          </div>
        </aside>
      </div>

      {isMounted ? (
        <>
          <ReaderModeToggle
            simpleMode={simpleMode}
            onToggle={() => setSimpleMode((prev) => !prev)}
          />
          <MobileBlogDrawer
            simpleMode={simpleMode}
            onToggleMode={() => setSimpleMode((prev) => !prev)}
          />
        </>
      ) : null}
    </div>
  )
}

const styles = {
  container: 'mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4',
  layoutGrid: 'flex flex-1 items-stretch justify-center gap-8',
  simpleLayoutGrid: 'gap-0',
  leftSidebar: 'hidden w-[280px] shrink-0 lg:block',
  rightSidebar: 'hidden w-[280px] shrink-0 xl:block',
  stickyWrapper:
    'sticky top-[86px] h-[calc(100vh-8rem)] space-y-6 overflow-y-auto pb-10 scrollbar-hide',
  mainContent:
    'flex w-full min-w-0 max-w-[640px] flex-1 flex-col md:max-w-[680px] lg:max-w-[720px] xl:max-w-[760px]',
  simpleMainContent:
    'max-w-[720px] md:max-w-[760px] lg:max-w-[800px] xl:max-w-[840px]',
}
