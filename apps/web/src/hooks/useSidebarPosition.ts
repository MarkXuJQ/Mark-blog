import { useState, useEffect } from 'react'

export function useSidebarPosition(containerRef: React.RefObject<HTMLElement>) {
  const [sidePos, setSidePos] = useState<{ left: number; right: number }>({ left: 0, right: 0 })

  useEffect(() => {
    const compute = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setSidePos({ left: rect.left, right: rect.right })
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [containerRef])

  return sidePos
}
