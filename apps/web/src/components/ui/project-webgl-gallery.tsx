import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { IconType } from 'react-icons'
import { cn } from '@/lib/classNames'
import { useSectionScrollProgress } from '@/hooks/useSectionScrollProgress'

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
  hintScroll?: string
  hintDrag?: string
  hintClick?: string
  closeLabel?: string
  className?: string
}

// Render a few full passes of the list so the panned row never reveals a gap
// no matter how far it scrolls horizontally.
const REPEATS = 3

export function ProjectWebglGallery({
  items,
  title,
  description,
  openLabel,
  hintScroll,
  hintDrag,
  hintClick,
  closeLabel = 'Close',
  className,
}: ProjectWebglGalleryProps) {
  const { ref, progress } = useSectionScrollProgress<HTMLElement>()
  const railRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; offset: number } | null>(null)
  const draggedRef = useRef(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [cardStep, setCardStep] = useState(240)
  const [base, setBase] = useState(0)
  const [selected, setSelected] = useState<ProjectWebglItem | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  const total = items.length

  // Measure one card + gap so the wrap distance tracks responsive layout, and
  // keep a base inset so the loop starts visually centered in the viewport.
  useEffect(() => {
    const rail = railRef.current
    if (!rail || !total) return
    const measure = () => {
      const first = rail.firstElementChild as HTMLElement | null
      const second = first?.nextElementSibling as HTMLElement | null
      if (first && second) {
        const step = second.offsetLeft - first.offsetLeft
        if (Number.isFinite(step) && step > 0) setCardStep(step)
        setBase(Math.max((window.innerWidth - first.offsetWidth) / 2, 16))
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(rail)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [total])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setReducedMotion(query.matches)
    read()
    query.addEventListener('change', read)
    return () => query.removeEventListener('change', read)
  }, [])

  // Resolved horizontal offset: scroll progress drives a continuous sweep from
  // left->right, drag adds a relative nudge, plus a base inset that centers the
  // loop in the viewport. Wrapped into one pass so it loops infinitely.
  const scrollOffset = reducedMotion ? 0 : progress * 2600
  const raw = base + scrollOffset + dragOffset
  const wrap = cardStep * total
  const resolved = wrap > 0 ? ((((raw % wrap) + wrap) % wrap)) : 0

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    dragRef.current = { x: event.clientX, offset: dragOffset }
    draggedRef.current = false
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = event.clientX - dragRef.current.x
    if (Math.abs(dx) > 4) {
      draggedRef.current = true
      // Only capture after intent-to-drag is clear so a plain click still
      // reaches the card button underneath.
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setDragOffset(dragRef.current.offset + dx)
  }

  const handlePointerEnd = () => {
    dragRef.current = null
    window.setTimeout(() => (draggedRef.current = false), 0)
  }

  const openProject = (item: ProjectWebglItem) => {
    if (draggedRef.current) return
    setSelected(item)
  }

  const closeProject = useCallback(() => setSelected(null), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeProject()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeProject])

  useEffect(() => {
    const reset = () => setDragOffset(0)
    window.addEventListener('resize', reset)
    return () => window.removeEventListener('resize', reset)
  }, [])

  if (!items.length) return null

  return (
    <section
      ref={ref}
      className={cn('mark-lab-webgl', className)}
      aria-label={title}
    >
      <div className="mark-lab-webgl__stage">
        <div className="mark-lab-webgl__header">
          <h2 id="mark-lab-webgl-title">{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>

        <div
          ref={railRef}
          className="mark-lab-webgl__rail"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          style={{ '--mw-rail-offset': `${resolved}px` } as CSSProperties}
        >
          {Array.from({ length: REPEATS }, (_, copy) =>
            items.map((item) => (
              <button
                key={`${copy}-${item.id}`}
                type="button"
                className="mark-lab-webgl__card"
                onClick={() => openProject(item)}
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
            ))
          )}
        </div>

        <div className="mark-lab-webgl__hint" aria-hidden="true">
          <span>{hintScroll ?? 'Scroll'}</span>
          <span>{hintDrag ?? 'Drag'}</span>
          <span>{hintClick ?? 'Click a project'}</span>
        </div>
      </div>

      {selected ? (
        <div className="mark-lab-webgl__modal" role="presentation">
          <div
            className="mark-lab-webgl__modal-backdrop"
            aria-hidden="true"
            onMouseDown={closeProject}
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeProject()
            }}
          />
          <div
            className="mark-lab-webgl__modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            aria-labelledby="mark-lab-webgl-modal-title"
            tabIndex={-1}
          >
            <button
              type="button"
              className="mark-lab-webgl__modal-close"
              aria-label={closeLabel}
              onClick={closeProject}
            >
              ×
            </button>
            {selected.preview ? (
              <div className="mark-lab-webgl__modal-preview">
                <picture>
                  {selected.preview.avifSrc ? (
                    <source srcSet={selected.preview.avifSrc} />
                  ) : null}
                  <img src={selected.preview.src} alt={selected.preview.alt} />
                </picture>
              </div>
            ) : null}
            <div className="mark-lab-webgl__modal-body">
              <h3 id="mark-lab-webgl-modal-title">{selected.title}</h3>
              <p>{selected.description}</p>
              <div className="mark-lab-webgl__actions">
                {selected.links.map((link) => {
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
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ProjectWebglGallery