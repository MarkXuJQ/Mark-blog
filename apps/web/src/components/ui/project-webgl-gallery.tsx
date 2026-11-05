import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import type { IconType } from 'react-icons'
import { cn } from '@/lib/classNames'

export type ProjectWebglLink = {
  href: string
  label: string
  icon: IconType
}

export type ProjectWebglItem = {
  id: string
  title: string
  description: string
  preview?: {
    src: string
    avifSrc?: string
    objectFit?: 'cover' | 'contain'
    alt: string
  }
  links: ProjectWebglLink[]
}

type ProjectWebglGalleryProps = {
  items: ProjectWebglItem[]
  title: string
  description: string
  openLabel: string
  className?: string
}

type PointerPosition = {
  x: number
  y: number
}

const INITIAL_POINTER: PointerPosition = { x: 0, y: 0 }

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setReduced(query.matches)
    read()
    query.addEventListener('change', read)
    return () => query.removeEventListener('change', read)
  }, [])

  return reduced
}

export function ProjectWebglGallery({
  items,
  title,
  description,
  openLabel,
  className,
}: ProjectWebglGalleryProps) {
  const [active, setActive] = useState(() => Math.floor(items.length / 2))
  const [pointer, setPointer] = useState(INITIAL_POINTER)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    setActive((index) => Math.min(index, Math.max(items.length - 1, 0)))
  }, [items.length])

  if (!items.length) return null

  const activeItem = items[active]

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return
    const bounds = event.currentTarget.getBoundingClientRect()
    setPointer({
      x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
      y: ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
    })
  }

  const handlePointerLeave = () => setPointer(INITIAL_POINTER)

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    setActive((index) => (index + direction + items.length) % items.length)
  }

  return (
    <section
      className={cn('mark-lab-webgl', className)}
      aria-labelledby="mark-lab-webgl-title"
    >
      <div className="mark-lab-webgl__header">
        <h2 id="mark-lab-webgl-title">{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>

      <div
        className="mark-lab-webgl__stage"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={
          {
            '--mw-pointer-x': reducedMotion ? '0px' : `${pointer.x * 34}px`,
            '--mw-pointer-y': reducedMotion ? '0px' : `${pointer.y * 16}px`,
            '--mw-pointer-tilt': reducedMotion
              ? '0deg'
              : `${pointer.x * -3}deg`,
          } as CSSProperties
        }
      >
        <div
          className="mark-lab-webgl__cards"
          role="tablist"
          aria-label={title}
        >
          {items.map((item, index) => {
            const relative = index - (items.length - 1) / 2
            const distance = Math.abs(relative)
            const cardStyle = {
              '--mw-card-offset': `calc(var(--mw-card-step) * ${relative})`,
              '--mw-card-depth': `${-distance * 4}px`,
              zIndex:
                active === index ? items.length + 1 : items.length - distance,
            } as CSSProperties

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active === index}
                aria-controls="mark-lab-webgl-panel"
                tabIndex={active === index ? 0 : -1}
                className={cn(
                  'mark-lab-webgl__card',
                  active === index && 'is-active'
                )}
                style={cardStyle}
                onClick={() => setActive(index)}
                onKeyDown={handleKeyDown}
              >
                <span className="mark-lab-webgl__card-face">
                  {item.preview ? (
                    <picture>
                      {item.preview.avifSrc ? (
                        <source
                          srcSet={item.preview.avifSrc}
                          type="image/avif"
                        />
                      ) : null}
                      <img
                        src={item.preview.src}
                        alt={item.preview.alt}
                        draggable={false}
                        className={
                          item.preview.objectFit === 'contain'
                            ? 'object-contain'
                            : 'object-cover'
                        }
                      />
                    </picture>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="mark-lab-webgl__card-empty"
                    />
                  )}
                  <span
                    className="mark-lab-webgl__card-shade"
                    aria-hidden="true"
                  />
                  <span className="mark-lab-webgl__card-name">
                    {item.title}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        id="mark-lab-webgl-panel"
        className="mark-lab-webgl__panel"
        role="tabpanel"
        aria-live="polite"
      >
        <div>
          <h3>{activeItem.title}</h3>
          <p>{activeItem.description}</p>
        </div>
        <div className="mark-lab-webgl__actions">
          {activeItem.links.map((link) => {
            const LinkIcon = link.icon
            return (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${openLabel}: ${link.label}`}
              >
                <LinkIcon aria-hidden="true" />
                <span>{link.label}</span>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default ProjectWebglGallery
