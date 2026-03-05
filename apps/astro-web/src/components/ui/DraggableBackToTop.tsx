import { useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { IoArrowUpSharp } from 'react-icons/io5'
import { useScrollToTop } from '../../hooks/useScrollToTop'
import { cn } from '../../utils/cn'

export function DraggableBackToTop() {
  const { showTopBtn, scrollToTop } = useScrollToTop()
  const controls = useAnimation()
  const isDragging = useRef(false)

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

  return (
    <motion.button
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
        y: 0, // Ensure initial y is 0 relative to bottom-6
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      className={cn(
        'fixed right-6 bottom-6 z-50 flex h-10 w-10 cursor-grab items-center justify-center active:cursor-grabbing',
        'rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm backdrop-blur',
        'dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300',
        // Remove transition-opacity from class because we handle it via motion style
        'transition-colors hover:bg-slate-50'
      )}
      aria-label="返回顶部"
    >
      <IoArrowUpSharp size={20} />
    </motion.button>
  )
}
