import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/classNames'

interface StaggeredListProps {
  children: ReactNode
  className?: string
  itemClassName?: string
  as?: 'div' | 'section' | 'ul'
  startIndex?: number
}

interface StaggeredChildProps {
  className?: string
  style?: CSSProperties
}

export function StaggeredList({
  as: Component = 'div',
  children,
  className,
  itemClassName,
  startIndex = 0,
}: StaggeredListProps) {
  let index = startIndex
  const animatedChildren = Children.map(children, (child) => {
    if (!isValidElement<StaggeredChildProps>(child)) return child

    const motionIndex = index
    index += 1

    return cloneElement(child as ReactElement<StaggeredChildProps>, {
      className: cn(
        child.props.className,
        itemClassName,
        'blog-list-item-enter'
      ),
      style: {
        ...child.props.style,
        '--blog-list-item-index': motionIndex,
      } as CSSProperties,
    })
  })

  return <Component className={className}>{animatedChildren}</Component>
}
