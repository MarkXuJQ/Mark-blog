import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getAllPosts } from '../../utils/posts'
import { SearchInput } from './SearchInput'
import {
  buildBlogSearchDocs,
  searchBlogDocs,
  normalizeQuery,
  type BlogSearchHit,
} from './blogSearch'

export function GlobalSearchModal({
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const posts = useMemo(() => getAllPosts(i18n.language), [i18n.language])
  const docs = useMemo(() => buildBlogSearchDocs(posts), [posts])

  const hits = useMemo(() => searchBlogDocs(docs, query, 24, 3), [docs, query])

  const navigateToHit = useCallback(
    (hit: BlogSearchHit) => {
      const q = normalizeQuery(query)
      const slug = encodeURIComponent(hit.post.slug)
      const target = `/blog/${slug}?q=${encodeURIComponent(q)}&i=${hit.matchIndex}`
      setIsOpen(false)
      navigate(target)
    },
    [navigate, query]
  )

  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange])

  useEffect(() => {
    const onGlobalSearch = (event: Event) => {
      const e = event as CustomEvent<{ open?: boolean; query?: string }>
      if (e.detail?.open === false) {
        setIsOpen(false)
        return
      }
      if (e.detail?.open === true) {
        setIsOpen(true)
        if (typeof e.detail.query === 'string') {
          setQuery(e.detail.query)
          setActiveIndex(0)
        }
      }
    }

    window.addEventListener('app:global-search', onGlobalSearch as EventListener)
    return () =>
      window.removeEventListener(
        'app:global-search',
        onGlobalSearch as EventListener
      )
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const isShortcut = (e.ctrlKey || e.metaKey) && key === 'k'
      if (isShortcut) {
        e.preventDefault()
        setIsOpen(true)
        return
      }

      if (!isOpen) return

      if (key === 'escape') {
        e.preventDefault()
        setIsOpen(false)
        return
      }

      if (key === 'arrowdown') {
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(0, hits.length - 1)))
        return
      }

      if (key === 'arrowup') {
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        return
      }

      if (key === 'enter' && hits.length > 0) {
        const hit = hits[activeIndex] || hits[0]
        if (!hit) return
        e.preventDefault()
        navigateToHit(hit)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, hits, isOpen, navigateToHit])

  useEffect(() => {
    if (!isOpen) return
    const id = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => window.clearTimeout(id)
  }, [isOpen])

  useEffect(() => {
    const container = listRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>(
      `[data-search-item-index="${activeIndex}"]`
    )
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[3000]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            aria-label="Close search"
            onClick={() => setIsOpen(false)}
          />

          <motion.div
            className="absolute left-1/2 top-[14vh] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            initial={{ y: 10, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 8, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
          >
            <div className="border-b border-slate-100 p-3 dark:border-slate-900">
              <SearchInput
                ref={inputRef}
                placeholder={t('search.placeholder')}
                value={query}
                onChange={(e) => {
                  setQuery(e.currentTarget.value)
                  setActiveIndex(0)
                }}
                onSearch={(value) => {
                  setQuery(value)
                  setActiveIndex(0)
                }}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>Ctrl/⌘ K</span>
                <span>
                  {hits.length > 0 ? t('search.resultsCount', { count: hits.length }) : ''}
                </span>
              </div>
            </div>

            <div
              ref={listRef}
              className="max-h-[55vh] overflow-auto p-2"
              role="listbox"
            >
              {hits.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  {query.trim() ? t('search.noResults') : t('search.hint')}
                </div>
              ) : (
                hits.map((hit, idx) => (
                  <button
                    key={`${hit.post.id}-${hit.matchIndex}-${idx}`}
                    type="button"
                    data-search-item-index={idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => navigateToHit(hit)}
                    className={[
                      'w-full rounded-xl px-3 py-2 text-left transition-colors',
                      idx === activeIndex
                        ? 'bg-slate-100 dark:bg-slate-900'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/60',
                    ].join(' ')}
                    role="option"
                    aria-selected={idx === activeIndex}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {hit.post.title}
                      </div>
                      <div className="shrink-0 text-xs text-slate-400">
                        {hit.post.date}
                      </div>
                    </div>
                    <div
                      className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400"
                      dangerouslySetInnerHTML={{ __html: hit.snippetHtml }}
                    />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
