import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import zhEvents from '@content/timeline/zh.json'
import enEvents from '@content/timeline/en.json'
import type { TimelineEvent } from '../types'
import { GitCommit, ChevronDown, ChevronRight } from 'lucide-react'

// Cast the JSON data to the correct type
const zhTimelineEvents = zhEvents as TimelineEvent[]
const enTimelineEvents = enEvents as TimelineEvent[]

function MilestoneMarker() {
  return (
    <span className={styles.milestoneMarker}>
      <GitCommit size={14} />
    </span>
  )
}

function ItemMarker() {
  return <span className={styles.itemMarker} />
}

export function Timeline() {
  const { t, i18n } = useTranslation()
  const events = i18n.language.startsWith('zh')
    ? zhTimelineEvents
    : enTimelineEvents

  const [expandedDates, setExpandedDates] = useState<string[]>([])

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('nav.timeline')}</h1>
        </div>

        <div className={styles.timeline}>
          {events.map((event, index) => {
            const isExpanded = expandedDates.includes(event.date)

            return (
              <div key={index} className={styles.eventWrapper}>
                {/* Milestone Marker */}
                <MilestoneMarker />

                {/* Event Header (Clickable) */}
                <div
                  className={styles.eventHeader}
                  onClick={() => toggleExpand(event.date)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      toggleExpand(event.date)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.eventMeta}>
                    <time className={styles.eventDate}>{event.date}</time>
                    {event.categories && (
                      <span className={styles.itemCount}>
                        {event.categories.reduce(
                          (acc, cat) => acc + cat.items.length,
                          0
                        )}{' '}
                        items
                      </span>
                    )}
                    <div className={styles.expandIcon}>
                      {isExpanded ? (
                        <ChevronDown size={20} />
                      ) : (
                        <ChevronRight size={20} />
                      )}
                    </div>
                  </div>
                  <h2 className={styles.eventTitle}>{event.title}</h2>
                  {event.description && (
                    <p className={styles.eventDescription}>
                      {event.description}
                    </p>
                  )}
                </div>

                {/* Collapsible Content */}
                <AnimatePresence>
                  {isExpanded && event.categories && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className={styles.expandedContent}
                    >
                      <div className={styles.categoriesWrapper}>
                        {event.categories.map((category, catIndex) => (
                          <div key={catIndex} className={styles.category}>
                            <h3 className={styles.categoryTitle}>
                              {category.title}
                            </h3>

                            <ul className={styles.itemsList}>
                              {category.items.map((item) => (
                                <li key={item.id} className={styles.item}>
                                  <ItemMarker />

                                  <span className={styles.itemDate}>
                                    {item.date}
                                  </span>

                                  <div className={styles.itemContent}>
                                    {item.link ? (
                                      <Link
                                        to={item.link}
                                        className={styles.itemLink}
                                      >
                                        {item.content}
                                      </Link>
                                    ) : (
                                      <span className={styles.itemText}>
                                        {item.content}
                                      </span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: 'mx-auto flex w-full max-w-[1400px] justify-center px-4 py-8',
  wrapper: 'w-full max-w-3xl space-y-8',
  header: 'flex items-center justify-between',
  title: 'text-3xl font-bold text-slate-900 dark:text-slate-100',
  timeline: 'relative border-l-2 border-slate-200 pl-8 dark:border-slate-800',
  eventWrapper: 'relative mb-8 last:mb-0',

  // Markers
  milestoneMarker:
    'absolute -left-[45px] z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white ring-4 ring-white dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-950',
  itemMarker:
    'absolute top-1.5 -left-[29px] flex h-2.5 w-2.5 items-center justify-center rounded-full bg-slate-400 ring-2 ring-white dark:bg-slate-600 dark:ring-slate-950',

  // Event Header
  eventHeader: 'mb-4 cursor-pointer',
  eventMeta: 'flex items-center gap-2',
  eventDate: 'text-sm font-semibold text-blue-600 dark:text-blue-400',
  itemCount:
    'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  expandIcon: 'ml-auto text-slate-400 transition-transform duration-200',
  eventTitle:
    'mt-1 text-2xl font-bold text-slate-900 transition-colors hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400',
  eventDescription: 'mt-2 text-slate-600 dark:text-slate-400',

  // Expanded Content
  expandedContent: 'overflow-hidden',
  categoriesWrapper: 'space-y-6 pb-4 pl-2',
  category:
    'relative border-l border-dashed border-slate-300 pl-6 dark:border-slate-700',
  categoryTitle:
    'mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200',
  itemsList: 'space-y-3',
  item: 'relative flex items-start gap-4 text-sm',
  itemDate:
    'min-w-[80px] pt-0.5 font-mono text-xs text-slate-400 dark:text-slate-500',
  itemContent: 'flex-1',
  itemLink:
    'text-slate-700 hover:text-blue-600 hover:underline dark:text-slate-300 dark:hover:text-blue-400',
  itemText: 'text-slate-600 dark:text-slate-400',
}
