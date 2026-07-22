import { useEffect, useRef, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { IoArrowUpSharp } from 'react-icons/io5'
import { useScrollToTop } from '../../hooks/useScrollToTop'
import { cn } from '@/lib/classNames'

export function DraggableBackToTop() {
  const { showTopBtn, scrollToTop } = useScrollToTop()
  const controls = useAnimation()
  const isDragging = useRef(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [footerOffset, setFooterOffset] = useState(0)

  const handleDragStart = () => {
    isDragging.current = true
  }

  const handleDragEnd = () => {
    // Snap back to the right edge (x=0) while preserving the vertical position (y)
    // We use a spring animation for a natural feel
    controls.start({
      x: 0,
      transition: { type: 'spring', stiffness: 400, damping: 30 },
    })

    // Reset dragging state after a short delay to prevent onClick from firing immediately after drag
    setTimeout(() => {
      isDragging.current = false
    }, 50)
  }

  const handleClick = () => {
    if (!isDragging.current) {
      scrollToTop()
    }
  }

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = document.documentElement.clientHeight
      const maxScroll = Math.max(1, scrollHeight - clientHeight)
      const progress = Math.min(1, Math.max(0, scrollTop / maxScroll))
      setScrollProgress(progress)

      const footer = document.querySelector('footer')
      if (!footer) {
        setFooterOffset(0)
        return
      }

      const footerTop = footer.getBoundingClientRect().top
      const overlap = Math.max(0, window.innerHeight - footerTop)
      const baseBottom = 64
      const margin = 8
      const extraOffset = Math.max(0, overlap + margin - baseBottom)
      setFooterOffset(extraOffset)
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [])

  const ringSize = 44
  const ringStroke = 2
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference * (1 - scrollProgress)

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={handleDragStart}
      // Allow dragging anywhere, but we'll snap back to the right
      onDragEnd={handleDragEnd}
      animate={controls}
      // Use opacity to hide/show instead of conditional rendering to maintain position state
      style={{
        opacity: showTopBtn ? 1 : 0,
        pointerEvents: showTopBtn ? 'auto' : 'none',
        y: -footerOffset, // Keep above footer when it's in view
      }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className="fixed right-6 bottom-18 z-50 h-11 w-11 cursor-grab active:cursor-grabbing"
    >
      <svg
        width={ringSize}
        height={ringSize}
        viewBox={`0 0 ${ringSize} ${ringSize}`}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={ringRadius}
          strokeWidth={ringStroke}
          className="stroke-slate-200/80 dark:stroke-[var(--border-color)]"
          fill="none"
        />
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={ringRadius}
          strokeWidth={ringStroke}
          className="stroke-sky-500 dark:stroke-sky-400"
          fill="none"
          strokeDasharray={ringCircumference}
          strokeDashoffset={ringOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
        />
      </svg>

      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'absolute inset-[2px] flex items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm backdrop-blur',
          'dark:border-[var(--border-color)] dark:bg-[color-mix(in_srgb,var(--surface-card)_92%,transparent)] dark:text-[var(--text-secondary)]',
          'transition-colors hover:bg-slate-50 dark:hover:bg-[var(--surface-card)] dark:hover:text-[var(--text-primary)]'
        )}
        aria-label="回到顶部"
      >
        <IoArrowUpSharp size={20} />
      </button>
    </motion.div>
  )
}
