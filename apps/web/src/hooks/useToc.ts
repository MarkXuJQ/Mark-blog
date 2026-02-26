import { useState, useEffect } from 'react'
import { setupTocTree } from '../utils/toc'

export function useToc(mainRef: React.RefObject<HTMLElement>, isBlogPost: boolean) {
  const [toc, setToc] = useState<Array<{ id: string; text: string; level: number }>>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (isBlogPost && mainRef.current) {
      const { flat, destroy } = setupTocTree(
        mainRef.current,
        (id) => setActiveId(id),
        { topOffset: isBlogPost ? 64 : 96 }
      )
      setToc(flat)
      return () => destroy()
    } else {
      setToc([])
      setActiveId('')
    }
  }, [isBlogPost, mainRef]) // Added mainRef to deps, though usually stable

  return { toc, activeId }
}
