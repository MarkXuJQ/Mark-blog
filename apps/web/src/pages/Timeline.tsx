import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import timelineData from '@content/timeline/events.json'
import type { TimelineEvent } from '../types'
import { GitCommit } from 'lucide-react'

// Cast the JSON data to the correct type
const timelineEvents = timelineData as TimelineEvent[]

// 提取出来的小组件：Milestone 标记（大圆点）
function MilestoneMarker() {
  return (
    <span className="timeline-milestone-marker">
      <GitCommit size={14} />
    </span>
  )
}

// 提取出来的小组件：Item 标记（小圆点）
function ItemMarker() {
  return <span className="timeline-item-marker" />
}

export function Timeline() {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('nav.timeline')}</h1>
      </div>

      <div className="relative border-l-2 border-slate-200 pl-8 dark:border-slate-800">
        {timelineEvents.map((event, index) => (
          <div key={index} className="relative mb-16 last:mb-0">
            {/* Level 1: Milestone (Big Node) */}
            <MilestoneMarker />

            <div className="mb-6">
              <div className="flex items-center gap-2">
                <time className="timeline-milestone-date">{event.date}</time>
                {event.categories && (
                  <span className="timeline-milestone-stats">
                    {event.categories.reduce(
                      (acc, cat) => acc + cat.items.length,
                      0,
                    )}{' '}
                    items
                  </span>
                )}
              </div>
              <h2 className="timeline-milestone-title">{event.title}</h2>
              {event.description && (
                <p className="timeline-milestone-desc">{event.description}</p>
              )}
            </div>

            {/* Level 2 & 3: Tree Structure */}
            {event.categories && (
              <div className="space-y-6 pl-2">
                {event.categories.map((category, catIndex) => (
                  <div
                    key={catIndex}
                    className="relative border-l border-dashed border-slate-300 pl-6 dark:border-slate-700"
                  >
                    <h3 className="timeline-category-title">
                      {category.title}
                    </h3>

                    <ul className="space-y-3">
                      {category.items.map((item) => (
                        <li
                          key={item.id}
                          className="relative flex items-center gap-4 text-sm"
                        >
                          {/* Item Dot */}
                          <ItemMarker />

                          <span className="timeline-item-date">{item.date}</span>

                          {item.link ? (
                            <Link
                              to={item.link}
                              className="timeline-item-link"
                            >
                              {item.content}
                            </Link>
                          ) : (
                            <span className="timeline-item-content">
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
