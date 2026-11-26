import { Outlet, useLocation } from 'react-router-dom'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LeftSidebarWidget, StatsWidget } from '@/components/blog/BlogWidgets'
import { TagCloudWidget } from '@/components/blog/TagCloudWidget'
import { MobileBlogDrawer } from '@/components/blog/MobileBlogDrawer'
import { ReaderModeToggle } from '@/components/blog/ReaderModeToggle'
import { normalizePathname } from '@/app/routing/normalizePathname'
import { getAllPostSummaries } from '@/lib/content/postSummaries'
import { cn } from '@/lib/classNames'
import { useReaderMode } from '@/hooks/useReaderMode'

export type ArchiveOutletContext = {
  simpleMode: boolean
  selectedTags: string[]
  toggleTag: (tag: string) => void
  clearTags: () => void
  selectCloudTag: (tag: string) => void
}

function getTagKey(tag: string) {
  return tag.trim().toLowerCase()
}

export function ArchiveLayout() {
  const { i18n } = useTranslation()
  const { pathname } = useLocation()
  const posts = getAllPostSummaries(i18n.language)
  const isLinksPage = normalizePathname(pathname) === '/links'
  const { isMounted, simpleMode, setSimpleMode } = useReaderMode()
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Post tags support multi-select; clicking one toggles just that tag.
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((current) => {
      const key = getTagKey(tag)
      const index = current.findIndex((item) => getTagKey(item) === key)
      if (index === -1) return [...current, tag]
      return current.filter((_, itemIndex) => itemIndex !== index)
    })
  }, [])

  const clearTags = useCallback(() => setSelectedTags([]), [])

  // The sidebar cloud is deliberately limited to a single active tag.
  const selectCloudTag = useCallback((tag: string) => {
    setSelectedTags((current) => {
      if (current.length === 1 && getTagKey(current[0]) === getTagKey(tag)) {
        return []
      }
      return [tag]
    })
  }, [])

  const cloudSelectedTag = selectedTags.length === 1 ? selectedTags[0] : null

  const outletContext = useMemo(
    () => ({
      simpleMode,
      selectedTags,
      toggleTag,
      clearTags,
      selectCloudTag,
    }),
    [simpleMode, selectedTags, toggleTag, clearTags, selectCloudTag]
  )

  return (
    <div className={styles.container}>
      <span id="page-top" />
      <div
        className={cn(
          styles.layoutGrid,
          isLinksPage && styles.linksLayoutGrid,
          simpleMode && styles.simpleLayoutGrid
        )}
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
            isLinksPage && styles.linksMainContent,
            simpleMode && styles.simpleMainContent
          )}
        >
          <Outlet context={outletContext} />
        </main>

        {!isLinksPage ? (
          <aside className={cn(styles.rightSidebar, simpleMode && '!hidden')}>
            <div className={styles.stickyWrapper}>
              <StatsWidget posts={posts} />
              <TagCloudWidget
                posts={posts}
                selectedTag={cloudSelectedTag}
                onToggleTag={selectCloudTag}
              />
            </div>
          </aside>
        ) : null}
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
  container: 'mx-auto flex w-full max-w-[1480px] flex-1 flex-col px-4',
  layoutGrid: 'flex flex-1 items-stretch justify-center gap-8',
  linksLayoutGrid: 'min-[1400px]:-translate-x-3',
  simpleLayoutGrid: 'gap-0',
  leftSidebar: 'hidden w-[260px] shrink-0 lg:block',
  rightSidebar: 'hidden w-[260px] shrink-0 xl:block',
  stickyWrapper:
    'sticky top-[86px] h-[calc(100vh-8rem)] space-y-6 overflow-y-auto pb-10 scrollbar-hide',
  mainContent:
    'flex w-full min-w-0 max-w-[660px] flex-1 flex-col md:max-w-[700px] lg:max-w-[760px] xl:max-w-[820px]',
  linksMainContent:
    'max-w-[660px] md:max-w-[700px] lg:max-w-[760px] xl:max-w-[1088px]',
  simpleMainContent:
    'max-w-[740px] md:max-w-[780px] lg:max-w-[820px] xl:max-w-[860px]',
}
