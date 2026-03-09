import { ArrowUpCircle, MessageSquareText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { cn } from '../../utils/cn'
import '../../i18n'

interface TocItem {
  id: string
  text: string
  level: number
}

interface BlogTocCardProps {
  toc?: TocItem[]
  title?: string
}

const styles = {
  tocCard: 'p-4',
  tocHeader:
    'mb-3 flex items-center justify-between gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300',
  tocActions: 'flex items-center gap-2 text-slate-400 dark:text-slate-500',
  tocActionLink:
    'transition-colors hover:text-slate-700 dark:hover:text-slate-300',
  tocBody:
    "relative pl-3 before:absolute before:inset-1 before:w-[3px] before:rounded-full before:bg-slate-100 before:content-[''] dark:before:bg-slate-800",
  tocList: 'space-y-2',
  tocItem: cn(
    'relative block overflow-hidden rounded-md px-2 py-1 text-sm truncate',
    'text-slate-700 hover:text-blue-600 cursor-pointer transition-colors',
    'dark:text-slate-300 dark:hover:text-blue-400'
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
  title,
}: {
  toc: TocItem[]
  activeId: string
  title?: string
}) {
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

  function hasActive(node: Node): boolean {
    if (node.id === activeId) return true
    for (const c of node.children) {
      if (hasActive(c)) return true
    }
    return false
  }

  function render(nodes: Node[]) {
    return nodes.map((n) => (
      <li
        key={n.id}
        className={cn(
          'list-none',
          'opacity-60 hover:opacity-95',
          (hasActive(n) || n.id === activeId) && 'opacity-100'
        )}
      >
        <a
          href={`#${n.id}`}
          onClick={(e) => handleLinkClick(e, n.id)}
          className={cn(
            n.id === activeId ? styles.tocItemActive : styles.tocItem,
            n.level > 1 && 'border-l border-slate-200 dark:border-slate-800'
          )}
          style={{ paddingLeft: `${(n.level - 1) * 14}px` }}
        >
          {n.text}
        </a>
        {n.children.length > 0 && (
          <ol className="mt-1 space-y-1">{render(n.children)}</ol>
        )}
      </li>
    ))
  }

  return (
    <ol className="space-y-1">
      {title && (
        <li
          className={cn(
            'list-none',
            'opacity-60 hover:opacity-95',
            activeId === 'page-top' && 'opacity-100'
          )}
        >
          <a
            href="#page-top"
            onClick={(e) => handleLinkClick(e, 'page-top')}
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
  )
}

export function BlogTocCard({ toc = [], title }: BlogTocCardProps) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string>('page-top')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
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
          >
            <MessageSquareText size={18} />
          </a>
        </div>
      </div>
      <div className={styles.tocBody}>
        <div className={styles.tocList}>
          {toc.length === 0 && !title ? (
            <div className="text-sm text-slate-500 italic">
              {t('blog.toc.empty')}
            </div>
          ) : (
            <TocList toc={toc} activeId={activeId} title={title} />
          )}
        </div>
      </div>
    </Card>
  )
}
