import { motion } from 'framer-motion'
import { cn } from '@/lib/classNames'
import { blogPostSharedTransition } from '@/lib/transitions/blogPostSharedTransition'

interface BlogPostSharedFrameProps {
  layoutId?: string
  className?: string
  children: React.ReactNode
}

export function BlogPostSharedFrame({
  layoutId,
  className,
  children,
}: BlogPostSharedFrameProps) {
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
      transition={blogPostSharedTransition}
      data-blog-post-shared-frame={layoutId}
      className={frameClassName}
    >
      {children}
    </motion.div>
  )
}
