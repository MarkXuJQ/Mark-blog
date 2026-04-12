import { ArrowUpCircle, MessageSquareText } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { cn } from '../../utils/cn'
import '../../i18n'
import { X } from 'lucide-react'

interface TocItem {
  id: string
  text: string
  level: number
}

interface BlogTocCardProps {
  toc?: TocItem[]
  title?: string
}
interface BlogTocDrawerProps {
  toc?: TocItem[]
  title?: string
  open: boolean
  onClose: () => void
}

const styles = {
  tocCard: 'p-4',
  tocHeader:
    'mb-3 flex items-center justify-between gap-2 text-sm font-semibold text-[var(--text-secondary)]',
  tocActions: 'flex items-center gap-2 text-[var(--text-disabled)]',
  tocActionLink:
    'transition-colors hover:text-[var(--text-primary)]',
  tocBody: 'relative',
  tocRail: 'relative pl-4',
  tocRailLine:
    'absolute left-0 top-0 bottom-0 w-[3px] rounded-full bg-slate-200/80 dark:bg-slate-800/80',
  tocRailIndicator: cn(
    'absolute left-0 h-4 w-[3px] rounded-full bg-blue-600',
    'transition-[top,height,opacity] duration-200 ease-out -translate-y-1/2',
    'dark:bg-blue-400'
  ),
  tocList: 'space-y-1 list-none pl-0',
  tocItem: cn(
    'relative block overflow-hidden rounded-md px-2 py-1 text-sm leading-5 truncate',
    'text-[var(--text-secondary)] hover:text-blue-600 cursor-pointer transition-colors',
    'dark:hover:text-blue-400'
  ),
  tocItemActive: cn(
    'relative text-blue-600 font-semibold',
    'dark:text-blue-400'
  ),
}

function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
  e.preventDefault()
  if (id === 'page-top') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.history.pushState({}, '', window.location.pathname)
    return
  }
  const element = document.getElementById(id)
  if (element) {
    const top = element.getBoundingClientRect().top + window.scrollY - 100 // Offset for sticky header
    window.scrollTo({ top, behavior: 'smooth' })
    // Update URL hash without scrolling
    window.history.pushState({}, '', `#${id}`)
  }
}

function TocList({
  toc,
  activeId,
  onItemClick,
  title,
}: {
  toc: TocItem[]
  activeId: string
  onItemClick: (id: string) => void
  title?: string
}) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const [indicatorTop, setIndicatorTop] = useState<number | null>(null)
  const [indicatorHeight, setIndicatorHeight] = useState<number>(16)

  type Node = TocItem & { children: Node[] }
  const stack: Node[] = []
  const tree: Node[] = []

  for (const item of toc) {
    const node: Node = { ...item, children: [] }
    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop()
    }
    if (stack.length === 0) {
      tree.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }
    stack.push(node)
  }

  useLayoutEffect(() => {
    if (!railRef.current) return
    const items = railRef.current.querySelectorAll(
      '[data-toc-id]'
    ) as NodeListOf<HTMLElement>
    const active = railRef.current.querySelector(
      `[data-toc-id="${activeId}"]`
    ) as HTMLElement | null
    if (!active || items.length === 0) return

    const railRect = railRef.current.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    const activeCenter = activeRect.top - railRect.top + activeRect.height / 2
    setIndicatorTop(activeCenter)

    const baseHeight = 16
    const first = items[0]
    const last = items[items.length - 1]
    const firstRect = first.getBoundingClientRect()
    const lastRect = last.getBoundingClientRect()
    const firstCenter =
      firstRect.top - railRect.top + firstRect.height / 2
    const lastCenter = lastRect.top - railRect.top + lastRect.height / 2

    let nextHeight = baseHeight
    if (activeId === first.getAttribute('data-toc-id')) {
      nextHeight = Math.max(baseHeight, firstCenter * 2)
    } else if (activeId === last.getAttribute('data-toc-id')) {
      nextHeight = Math.max(baseHeight, (railRect.height - lastCenter) * 2)
    }
    nextHeight = Math.min(nextHeight, railRect.height)
    setIndicatorHeight(nextHeight)
  }, [activeId, toc, title])

  function render(nodes: Node[]) {
    return nodes.map((n) => (
      <li key={n.id} className="list-none">
        <a
          href={`#${n.id}`}
          onClick={(e) => {
            onItemClick(n.id)
            handleLinkClick(e, n.id)
          }}
          data-toc-id={n.id}
          className={cn(
            n.id === activeId ? styles.tocItemActive : styles.tocItem
          )}
          style={{ paddingLeft: `${(n.level - 1) * 14}px` }}
        >
          {n.text}
        </a>
        {n.children.length > 0 && (
          <ol className="mt-1 space-y-1 list-none pl-0">
            {render(n.children)}
          </ol>
        )}
      </li>
    ))
  }

  return (
    <div ref={railRef} className={styles.tocRail}>
      <span className={styles.tocRailLine} aria-hidden="true" />
      <span
        className={styles.tocRailIndicator}
        aria-hidden="true"
        style={
          indicatorTop == null
            ? { opacity: 0 }
            : { top: indicatorTop, height: indicatorHeight }
        }
      />
      <ol className="space-y-1 list-none pl-0">
        {title && (
          <li className="list-none">
            <a
              href="#page-top"
              onClick={(e) => {
                onItemClick('page-top')
                handleLinkClick(e, 'page-top')
              }}
              data-toc-id="page-top"
              className={cn(
                activeId === 'page-top' ? styles.tocItemActive : styles.tocItem,
                'font-semibold'
              )}
            >
              {title}
            </a>
          </li>
        )}
        {render(tree)}
      </ol>
    </div>
  )
}

function useActiveTocId(toc: TocItem[]) {
  const [activeId, setActiveId] = useState<string>('page-top')
  const manualUntilRef = useRef<number>(0)

  const setActiveIdManual = (id: string) => {
    manualUntilRef.current = Date.now() + 800
    setActiveId(id)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < manualUntilRef.current) return
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-100px 0px -66% 0px',
        threshold: 0,
      }
    )

    // Observe the main title or top of the article
    const articleTitle = document.querySelector('h1')
    if (articleTitle) {
      // Ensure the title has an ID if we want to track it
      if (!articleTitle.id) articleTitle.id = 'page-top'
      observer.observe(articleTitle)
    }

    toc.forEach((item) => {
      const element = document.getElementById(item.id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [toc])

  return { activeId, setActiveIdManual }
}

export function BlogTocCard({ toc = [], title }: BlogTocCardProps) {
  const { t } = useTranslation()
  const { activeId, setActiveIdManual } = useActiveTocId(toc)

  return (
    <Card className={styles.tocCard}>
      <div className={styles.tocHeader}>
        <span>{t('blog.toc.title')}</span>
        <div className={styles.tocActions}>
          <a
            href="#page-top"
            aria-label={t('blog.toc.backToTop')}
            className={styles.tocActionLink}
            onClick={(e) => handleLinkClick(e, 'page-top')}
          >
            <ArrowUpCircle size={18} />
          </a>
          <a
            href="#twikoo"
            aria-label={t('blog.toc.comments')}
            className={styles.tocActionLink}
            onClick={(e) => handleLinkClick(e, 'twikoo')}
          >
            <MessageSquareText size={18} />
          </a>
        </div>
      </div>
      <div className={styles.tocBody}>
        <div className={styles.tocList}>
          {toc.length === 0 && !title ? (
            <div className="text-sm text-[var(--text-secondary)]">
              {t('blog.toc.empty')}
            </div>
          ) : (
            <TocList
              toc={toc}
              activeId={activeId}
              onItemClick={setActiveIdManual}
              title={title}
            />
          )}
        </div>
      </div>
    </Card>
  )
}

export function BlogTocDrawer({
  toc = [],
  title,
  open,
  onClose,
}: BlogTocDrawerProps) {
  const { t } = useTranslation()
  const { activeId, setActiveIdManual } = useActiveTocId(toc)

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-transparent',
          open ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          'fixed right-6 top-[10vh] z-50 w-[min(82vw,320px)] rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-0 transition-all duration-200',
          'dark:border-slate-800 dark:bg-slate-950/95',
          open
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none translate-x-4 opacity-0'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] dark:border-slate-800">
          <span>{t('blog.toc.title')}</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-disabled)] transition hover:bg-slate-100 hover:text-[var(--text-primary)] dark:hover:bg-slate-800"
            aria-label={t('blog.toc.close', 'Close')}
          >
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          {toc.length === 0 && !title ? (
            <div className="text-sm text-[var(--text-secondary)]">
              {t('blog.toc.empty')}
            </div>
          ) : (
            <TocList
              toc={toc}
              activeId={activeId}
              onItemClick={setActiveIdManual}
              title={title}
            />
          )}
        </div>
      </div>
    </>
  )
}
