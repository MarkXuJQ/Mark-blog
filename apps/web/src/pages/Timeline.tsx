import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import timelineData from '@content/timeline/events.json'
import type { TimelineEvent } from '../types'
import { GitCommit } from 'lucide-react'
import { cn } from '../utils/cn'

// Cast the JSON data to the correct type
const timelineEvents = timelineData as TimelineEvent[]

// 提取出来的小组件：Milestone 标记（大圆点）
function MilestoneMarker() {
  return (
    <span className={styles.milestoneMarker}>
      <GitCommit size={14} />
    </span>
  )
}

// 提取出来的小组件：Item 标记（小圆点）
function ItemMarker() {
  return <span className={styles.itemMarker} />
}

export function Timeline() {
  const { t } = useTranslation()

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('nav.timeline')}</h1>
      </div>

      <div className={styles.timelineWrapper}>
        {timelineEvents.map((event, index) => (
          <div key={index} className={styles.eventContainer}>
            {/* Level 1: Milestone (Big Node) */}
            <MilestoneMarker />

            <div className={styles.eventHeader}>
              <div className={styles.eventMeta}>
                <time className={styles.milestoneDate}>{event.date}</time>
                {event.categories && (
                  <span className={styles.milestoneStats}>
                    {event.categories.reduce(
                      (acc, cat) => acc + cat.items.length,
                      0,
                    )}{' '}
                    items
                  </span>
                )}
              </div>
              <h2 className={styles.milestoneTitle}>{event.title}</h2>
              {event.description && (
                <p className={styles.milestoneDesc}>{event.description}</p>
              )}
            </div>

            {/* Level 2 & 3: Tree Structure */}
            {event.categories && (
              <div className={styles.categoryWrapper}>
                {event.categories.map((category, catIndex) => (
                  <div
                    key={catIndex}
                    className={styles.categoryContainer}
                  >
                    <h3 className={styles.categoryTitle}>
                      {category.title}
                    </h3>

                    <ul className={styles.itemList}>
                      {category.items.map((item) => (
                        <li
                          key={item.id}
                          className={styles.item}
                        >
                          {/* Item Dot */}
                          <ItemMarker />

                          <span className={styles.itemDate}>{item.date}</span>

                          {item.link ? (
                            <Link
                              to={item.link}
                              className={styles.itemLink}
                            >
                              {item.content}
                            </Link>
                          ) : (
                            <span className={styles.itemContent}>
                              {item.content}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: "mx-auto max-w-3xl space-y-8",
  header: "flex items-center justify-between",
  title: "text-3xl font-bold",
  timelineWrapper: "relative border-l-2 border-slate-200 pl-8 dark:border-slate-800",
  eventContainer: "relative mb-16 last:mb-0",
  eventHeader: "mb-6",
  eventMeta: "flex items-center gap-2",
  categoryWrapper: "space-y-6 pl-2",
  categoryContainer: "relative border-l border-dashed border-slate-300 pl-6 dark:border-slate-700",
  itemList: "space-y-3",
  item: "relative flex items-center gap-4 text-sm",
  milestoneMarker: cn(
    "absolute -left-[45px] flex h-6 w-6 items-center justify-center rounded-full",
    "bg-slate-900 text-white ring-4 ring-white",
    "dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-950"
  ),
  itemMarker: cn(
    "absolute -left-[30px] flex h-2.5 w-2.5 items-center justify-center rounded-full",
    "bg-slate-400 ring-2 ring-white",
    "dark:bg-slate-600 dark:ring-slate-950"
  ),
  milestoneDate: "text-sm font-semibold text-blue-600 dark:text-blue-400",
  milestoneTitle: "text-2xl font-bold text-slate-900 dark:text-slate-100",
  milestoneDesc: "mt-2 text-slate-600 dark:text-slate-400",
  milestoneStats: cn(
    "ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
    "bg-slate-100 text-slate-600",
    "dark:bg-slate-800 dark:text-slate-400"
  ),
  categoryTitle: "mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200",
  itemDate: "min-w-[80px] text-xs font-mono text-slate-400 dark:text-slate-500",
  itemContent: "text-slate-600 dark:text-slate-400",
  itemLink: cn(
    "text-slate-700 hover:text-blue-600 hover:underline",
    "dark:text-slate-300 dark:hover:text-blue-400"
  )
}
