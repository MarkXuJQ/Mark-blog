'use client'

import { AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getSiteUrl, toAbsoluteUrl } from '@/lib/seo'
import { LinkPreviewCard, LinkPreviewMetadataCard } from './link-preview'

const PREVIEW_WIDTH = 220
const PREVIEW_HEIGHT = 138
const PREVIEW_OFFSET = 40
const VIEWPORT_GUTTER = 12
const CLOSE_DELAY_MS = 220

type ActiveLinkState = {
  key: string
  rect: DOMRect
  href: string
  previewUrl?: string
  mode: 'metadata' | 'screenshot'
  title?: string
  description?: string
  badge?: string
  urlLabel?: string
  isStatic?: boolean
  imageSrc?: string
}

function shouldEnableGlobalPreview() {
  if (typeof window === 'undefined') {
    return false
  }

  if (document.documentElement.hasAttribute('data-simple-reading')) {
    return false
  }

  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function isSkippableHref(href: string) {
  return (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('javascript:')
  )
}

function resolvePreviewUrl(rawHref: string, siteUrl: string) {
  try {
    const target = new URL(rawHref, window.location.href)
    if (!/^https?:$/.test(target.protocol)) {
      return null
    }

    const isLocalRuntime =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'

    if (target.origin === window.location.origin) {
      const internalPath = `${target.pathname}${target.search}`
      return isLocalRuntime
        ? toAbsoluteUrl(internalPath, siteUrl)
        : target.toString()
    }

    return target.toString()
  } catch {
    return null
  }
}

function getEligibleAnchor(target: EventTarget | null) {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null

  if (!(element instanceof Element)) {
    return null
  }

  const anchor = element.closest('a[href]')
  if (!(anchor instanceof HTMLAnchorElement)) {
    return null
  }

  if (
    anchor.dataset.linkPreview === 'off' ||
    anchor.closest('[data-link-preview="off"]') ||
    anchor.closest('[data-link-preview-content="true"]') ||
    anchor.hasAttribute('download') ||
    !anchor.closest(
      '.markdown-body, .prose, [data-link-preview-scope="article"]'
    ) ||
    anchor.querySelector('img, picture, video, canvas, button, input, textarea')
  ) {
    return null
  }

  const rawHref = anchor.getAttribute('href')?.trim()
  if (!rawHref || isSkippableHref(rawHref)) {
    return null
  }

  return anchor
}

function getPlacement(rect: DOMRect) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const topCandidate = rect.top - PREVIEW_HEIGHT - PREVIEW_OFFSET
  const bottomCandidate = rect.bottom + PREVIEW_OFFSET
  const canPlaceAbove = topCandidate >= VIEWPORT_GUTTER
  const top = canPlaceAbove
    ? topCandidate
    : Math.min(
        bottomCandidate,
        viewportHeight - PREVIEW_HEIGHT - VIEWPORT_GUTTER
      )
  const left = Math.min(
    Math.max(rect.left + rect.width / 2 - PREVIEW_WIDTH / 2, VIEWPORT_GUTTER),
    viewportWidth - PREVIEW_WIDTH - VIEWPORT_GUTTER
  )

  return { top, left }
}

export function GlobalLinkPreview() {
  const { pathname } = useLocation()
  const [isMounted, setIsMounted] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [activeLink, setActiveLink] = useState<ActiveLinkState | null>(null)
  const [isPreviewHovered, setIsPreviewHovered] = useState(false)
  const activeAnchorRef = useRef<HTMLAnchorElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const mouseX = useMotionValue(0)
  const followX = useSpring(mouseX, { stiffness: 120, damping: 20 })

  const siteUrl = useMemo(() => getSiteUrl(), [])

  useEffect(() => {
    setIsMounted(true)
    setEnabled(shouldEnableGlobalPreview())

    const media = window.matchMedia('(hover: hover) and (pointer: fine)')
    const handleChange = () => setEnabled(shouldEnableGlobalPreview())
    const handleSimpleReadingChange = () => {
      setEnabled(shouldEnableGlobalPreview())
    }
    const observer = new MutationObserver(handleSimpleReadingChange)

    media.addEventListener('change', handleChange)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-simple-reading'],
    })

    return () => {
      media.removeEventListener('change', handleChange)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    activeAnchorRef.current = null
    setActiveLink(null)
    setIsPreviewHovered(false)
    mouseX.set(0)
  }, [mouseX, pathname])

  useEffect(() => {
    if (!enabled) {
      setActiveLink(null)
      return
    }

    const clearCloseTimer = () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }

    const closePreview = () => {
      clearCloseTimer()
      activeAnchorRef.current = null
      setIsPreviewHovered(false)
      setActiveLink(null)
      mouseX.set(0)
    }

    const scheduleClose = () => {
      clearCloseTimer()
      closeTimerRef.current = window.setTimeout(() => {
        if (!isPreviewHovered) {
          closePreview()
        }
      }, CLOSE_DELAY_MS)
    }

    const openPreview = (anchor: HTMLAnchorElement, clientX?: number) => {
      const rawHref = anchor.getAttribute('href')?.trim()
      if (!rawHref) {
        return
      }

      const staticImageSrc = anchor.dataset.linkPreviewImage
      const overrideUrl = anchor.dataset.linkPreviewUrl
      const previewUrl = resolvePreviewUrl(overrideUrl || rawHref, siteUrl)
      const previewTitle = anchor.dataset.linkPreviewTitle?.trim()
      const previewDescription =
        anchor.dataset.linkPreviewDescription?.trim() || undefined
      const previewBadge = anchor.dataset.linkPreviewBadge?.trim() || undefined
      const previewUrlLabel =
        anchor.dataset.linkPreviewUrlLabel?.trim() || undefined
      const hasMetadata = Boolean(previewTitle)
      if (!previewUrl && !staticImageSrc && !hasMetadata) {
        return
      }

      const rect = anchor.getBoundingClientRect()
      if (clientX !== undefined) {
        mouseX.set((clientX - rect.left - rect.width / 2) * 0.18)
      } else {
        mouseX.set(0)
      }

      if (activeAnchorRef.current === anchor) {
        clearCloseTimer()
        return
      }

      activeAnchorRef.current = anchor
      setActiveLink({
        key: `${previewUrl || staticImageSrc || previewTitle}-${Math.round(rect.left)}-${Math.round(rect.top)}`,
        rect,
        href: previewUrl || rawHref,
        previewUrl: previewUrl || rawHref,
        mode: hasMetadata ? 'metadata' : 'screenshot',
        title: previewTitle || undefined,
        description: previewDescription,
        badge: previewBadge,
        urlLabel: previewUrlLabel,
        isStatic: Boolean(staticImageSrc),
        imageSrc: staticImageSrc,
      })
      clearCloseTimer()
    }

    const handleMouseOver = (event: MouseEvent) => {
      const anchor = getEligibleAnchor(event.target)
      if (!anchor) {
        return
      }

      openPreview(anchor, event.clientX)
    }

    const handleMouseMove = (event: MouseEvent) => {
      const anchor = getEligibleAnchor(event.target)
      if (!anchor) {
        if (!isPreviewHovered) {
          scheduleClose()
        }
        return
      }

      if (activeAnchorRef.current === anchor) {
        const rect = anchor.getBoundingClientRect()
        mouseX.set((event.clientX - rect.left - rect.width / 2) * 0.18)
        clearCloseTimer()
        return
      }

      openPreview(anchor, event.clientX)
    }

    const handleMouseDown = () => {
      closePreview()
    }

    const handleFocusIn = (event: FocusEvent) => {
      const anchor = getEligibleAnchor(event.target)
      if (!anchor) {
        return
      }

      openPreview(anchor)
    }

    const handleFocusOut = () => {
      if (!isPreviewHovered) {
        scheduleClose()
      }
    }

    const refreshPreviewPosition = () => {
      const anchor = activeAnchorRef.current
      if (!anchor || !document.contains(anchor)) {
        closePreview()
        return
      }

      const rect = anchor.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        closePreview()
        return
      }

      setActiveLink((current) =>
        current
          ? {
              ...current,
              key: `${current.previewUrl || current.title || current.href}-${Math.round(rect.left)}-${Math.round(rect.top)}`,
              rect,
            }
          : current
      )
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePreview()
      }
    }

    document.addEventListener('mouseover', handleMouseOver, { passive: true })
    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mousedown', handleMouseDown, { passive: true })
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    window.addEventListener('scroll', refreshPreviewPosition, true)
    window.addEventListener('resize', refreshPreviewPosition)
    window.addEventListener('keydown', handleEscape)

    return () => {
      clearCloseTimer()
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      window.removeEventListener('scroll', refreshPreviewPosition, true)
      window.removeEventListener('resize', refreshPreviewPosition)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [enabled, isPreviewHovered, mouseX, siteUrl])

  if (!isMounted || !enabled) {
    return null
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[140]"
      aria-hidden="true"
    >
      <AnimatePresence>
        {activeLink ? (
          <div
            className="pointer-events-none absolute"
            style={getPlacement(activeLink.rect)}
          >
            <div
              className="pointer-events-auto"
              onPointerEnter={() => {
                if (closeTimerRef.current !== null) {
                  window.clearTimeout(closeTimerRef.current)
                  closeTimerRef.current = null
                }
                setIsPreviewHovered(true)
              }}
              onPointerLeave={() => {
                setIsPreviewHovered(false)
                closeTimerRef.current = window.setTimeout(() => {
                  activeAnchorRef.current = null
                  mouseX.set(0)
                  setActiveLink(null)
                }, CLOSE_DELAY_MS)
              }}
            >
              {activeLink.mode === 'metadata' && activeLink.title ? (
                <LinkPreviewMetadataCard
                  key={activeLink.key}
                  title={activeLink.title}
                  description={activeLink.description}
                  badge={activeLink.badge}
                  imageSrc={activeLink.imageSrc}
                  urlLabel={activeLink.urlLabel}
                  href={activeLink.href}
                  followX={followX}
                />
              ) : (
                <LinkPreviewCard
                  key={activeLink.key}
                  url={activeLink.href}
                  previewUrl={activeLink.previewUrl}
                  peekWidth={PREVIEW_WIDTH}
                  peekHeight={PREVIEW_HEIGHT}
                  clickable={false}
                  enableLensEffect
                  isStatic={Boolean(activeLink.isStatic)}
                  imageSrc={activeLink.imageSrc}
                  followX={followX}
                />
              )}
            </div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body
  )
}
