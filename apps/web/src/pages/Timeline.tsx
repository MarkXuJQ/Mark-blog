import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import zhEvents from '@content/timeline/website/zh.json'
import enEvents from '@content/timeline/website/en.json'
import zhQuickFixes from '@content/timeline/quickfix/zh.json'
import enQuickFixes from '@content/timeline/quickfix/en.json'
import type { TimelineEvent, TimelineItem, QuickFixGroup } from '../types'
import { GitCommit, ChevronDown, ChevronRight } from 'lucide-react'
import { Seo } from '../components/seo/Seo'

// Cast the JSON data to the correct type
const zhTimelineEvents = zhEvents as TimelineEvent[]
const enTimelineEvents = enEvents as TimelineEvent[]
const zhQuickFixItems = zhQuickFixes as QuickFixGroup[]
const enQuickFixItems = enQuickFixes as QuickFixGroup[]

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
  const quickFixes = i18n.language.startsWith('zh')
    ? zhQuickFixItems
    : enQuickFixItems
  const quickFixGroups = useMemo(
    () =>
      [...quickFixes].sort((a, b) => b.date.localeCompare(a.date)),
    [quickFixes]
  )

  const [expandedDates, setExpandedDates] = useState<string[]>([])
  const tabs = useMemo(
    () => [
      { id: 'website', label: t('timeline.websiteTab') },
      { id: 'quickfix', label: t('timeline.quickfixTab') },
      { id: 'life', label: t('timeline.lifeTab') },
    ],
    [t]
  )
  const [activeTab, setActiveTab] = useState<'website' | 'quickfix' | 'life'>(
    'website'
  )

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    )
  }

  return (
    <div className={styles.container}>
      <Seo title={t('nav.timeline')} />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('nav.timeline')}</h1>
        </div>

        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={
                activeTab === tab.id ? styles.tabActive : styles.tab
              }
              onClick={() =>
                setActiveTab(tab.id as 'website' | 'quickfix' | 'life')
              }
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.span
                  layoutId="timeline-tab-underline"
                  className={styles.tabUnderline}
                />
              )}
            </button>
          ))}
        </div>
        <div className={styles.tabRule} aria-hidden="true" />

        {activeTab === 'website' && (
          <section className={styles.section}>
            <div className={styles.timeline}>
              {events.map((event, index) => {
                const isExpanded = expandedDates.includes(event.date)
                const categoryCount =
                  event.categories?.reduce(
                    (acc, cat) => acc + cat.items.length,
                    0
                  ) ?? 0
                const totalCount = categoryCount

                return (
                  <div key={index} className={styles.eventWrapper}>
                    <MilestoneMarker />

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
                        {totalCount > 0 && (
                          <span className={styles.itemCount}>
                            {totalCount} {t('timeline.items')}
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
                      <h3 className={styles.eventTitle}>{event.title}</h3>
                      {event.description && (
                        <p className={styles.eventDescription}>
                          {event.description}
                        </p>
                      )}
                    </div>

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
                                <h4 className={styles.categoryTitle}>
                                  {category.title}
                                </h4>

                                <ul className={styles.itemsList}>
                                  {category.items.map((item) => (
                                    <li key={item.id} className={styles.item}>
                                      <ItemMarker />

                                      {item.date ? (
                                        <span className={styles.itemDate}>
                                          {item.date}
                                        </span>
                                      ) : (
                                        <span
                                          className={styles.itemDate}
                                          aria-hidden="true"
                                        >
                                          —
                                        </span>
                                      )}

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
          </section>
        )}

        {activeTab === 'quickfix' && (
          <section className={styles.section}>
            <ul className={styles.quickfixList}>
              {quickFixGroups.map((group) => (
                <li key={group.id} className={styles.quickfixGroup}>
                  <div className={styles.quickfixHeader}>
                    <span className={styles.quickfixMarker} />
                    <time className={styles.quickfixDate}>{group.date}</time>
                  </div>
                  <ul className={styles.quickfixItems}>
                    {group.content.map((entry, index) => (
                      <li key={`${group.id}-${index}`} className={styles.quickfixItem}>
                        <span className={styles.quickfixDot} />
                        <span className={styles.quickfixText}>{entry}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === 'life' && (
          <section className={styles.section}>
            <div className={styles.lifePanel}>
              <p className={styles.lifeText}>
                {t('underConstruction.description')}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

const styles = {
  container:
    'mx-auto flex w-full max-w-[1400px] justify-center px-5 py-8 sm:px-6',
  wrapper: 'w-full max-w-3xl space-y-6',
  header: 'flex items-center justify-between',
  title: 'text-3xl font-bold text-slate-900 dark:text-slate-100',
  tabs: 'flex flex-wrap gap-6 text-sm',
  tab: 'relative pb-2 font-medium text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-100',
  tabActive: 'relative pb-2 font-semibold text-slate-900 dark:text-slate-100',
  tabUnderline:
    'absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-slate-900 dark:bg-slate-100',
  tabRule: 'h-px w-full bg-slate-200 dark:bg-slate-800',
  section: 'space-y-6',
  sectionHeader: 'space-y-2',
  sectionTitle: 'text-xl font-semibold text-slate-900 dark:text-slate-100',
  sectionDesc: 'text-sm text-slate-500 dark:text-slate-400',
  timeline:
    'relative border-l-2 border-slate-200 pl-8 dark:border-slate-800 ml-4 sm:ml-0',
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
  quickfixList: 'space-y-5',
  quickfixGroup:
    'border-b border-slate-200/70 pb-5 last:border-b-0 dark:border-slate-800/70',
  quickfixHeader: 'flex items-center gap-3 text-sm',
  quickfixMarker:
    'h-2.5 w-2.5 rounded-full bg-slate-400 ring-2 ring-white dark:bg-slate-600 dark:ring-slate-950',
  quickfixDate:
    'font-mono text-sm font-semibold text-blue-600 dark:text-blue-400',
  quickfixItems: 'mt-3 space-y-2 pl-5',
  quickfixItem: 'flex items-start gap-2 text-sm',
  quickfixDot:
    'mt-2 h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700',
  quickfixText: 'text-slate-600 dark:text-slate-400',
  lifePanel:
    'rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/40 dark:text-slate-400',
  lifeText: 'text-sm',
}
