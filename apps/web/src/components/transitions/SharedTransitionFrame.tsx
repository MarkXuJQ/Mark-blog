import { motion } from 'framer-motion'
import { cn } from '@/lib/classNames'
import { postSharedTransition } from '@/lib/transitions/postSharedTransition'

interface SharedTransitionFrameProps {
  layoutId?: string
  className?: string
  children: React.ReactNode
}

export function SharedTransitionFrame({
  layoutId,
  className,
  children,
}: SharedTransitionFrameProps) {
  const frameClassName = cn(
    layoutId && 'transform-gpu will-change-[transform,border-radius]',
    className
  )

  if (!layoutId) {
    return <div className={frameClassName}>{children}</div>
  }

  return (
    <motion.div
      layoutId={layoutId}
      transition={postSharedTransition}
      data-shared-transition-frame={layoutId}
      className={frameClassName}
    >
      {children}
    </motion.div>
  )
}
