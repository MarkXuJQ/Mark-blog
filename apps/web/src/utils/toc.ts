export type TocItem = { id: string; text: string; level: number }

type SetupTocOptions = {
  topOffset?: number
  headingSelector?: string
  minLevel?: 1 | 2 | 3
  maxLevel?: 1 | 2 | 3
}

export function setupToc(
  root: HTMLElement,
  onActiveChange: (id: string) => void,
  options: SetupTocOptions = {}
): { toc: TocItem[]; destroy: () => void } {
  const {
    topOffset = 96,
    headingSelector = 'article h1, article h2, article h3',
    minLevel = 1,
    maxLevel = 3,
  } = options

  const rawHeadings = Array.from(
    root.querySelectorAll<HTMLElement>(headingSelector)
  )

  const headings = rawHeadings.filter((h) => {
    const level = h.tagName === 'H1' ? 1 : h.tagName === 'H2' ? 2 : 3
    return level >= minLevel && level <= maxLevel
  })

  const usedIds: Record<string, number> = {}
  const toc: TocItem[] = headings
    .map((h) => {
      const text = (h.textContent || '').trim()
      if (!text) return null
      let id = h.id
      if (!id) {
        const base = text
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
        const count = (usedIds[base] ?? -1) + 1
        usedIds[base] = count
        id = count === 0 ? base : `${base}-${count}`
        h.id = id
      }
      const level = h.tagName === 'H1' ? 1 : h.tagName === 'H2' ? 2 : 3
      return { id, text, level }
    })
    .filter(Boolean) as TocItem[]

  let raf = 0
  function detectActive() {
    let activeId = toc[0]?.id || ''
    for (let i = 0; i < headings.length; i++) {
      const r = headings[i].getBoundingClientRect()
      if (r.top - topOffset <= 0) {
        activeId = headings[i].id
      } else {
        break
      }
    }
    onActiveChange(activeId)
  }

  const onScroll = () => {
    if (raf) return
    raf = window.requestAnimationFrame(() => {
      detectActive()
      raf = 0
    })
  }

  detectActive()
  window.addEventListener('scroll', onScroll, { passive: true })

  const destroy = () => {
    window.removeEventListener('scroll', onScroll)
    if (raf) {
      window.cancelAnimationFrame(raf)
      raf = 0
    }
  }

  return { toc, destroy }
}

export type TocNode = { id: string; text: string; level: number; children: TocNode[] }

export function setupTocTree(
  root: HTMLElement,
  onActiveChange: (id: string) => void,
  options: SetupTocOptions = {}
): { tree: TocNode[]; flat: TocItem[]; destroy: () => void } {
  const { topOffset = 96, headingSelector = 'article h1, article h2, article h3', minLevel = 1, maxLevel = 3 } = options

  const rawHeadings = Array.from(root.querySelectorAll<HTMLElement>(headingSelector))
  const headings = rawHeadings.filter((h) => {
    const level = h.tagName === 'H1' ? 1 : h.tagName === 'H2' ? 2 : 3
    return level >= minLevel && level <= maxLevel
  })

  const usedIds: Record<string, number> = {}
  const flat: TocItem[] = headings
    .map((h) => {
      const text = (h.textContent || '').trim()
      if (!text) return null
      let id = h.id
      if (!id) {
        const base = text
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
        const count = (usedIds[base] ?? -1) + 1
        usedIds[base] = count
        id = count === 0 ? base : `${base}-${count}`
        h.id = id
      }
      const level = h.tagName === 'H1' ? 1 : h.tagName === 'H2' ? 2 : 3
      return { id, text, level }
    })
    .filter(Boolean) as TocItem[]

  const stack: TocNode[] = []
  const tree: TocNode[] = []
  for (const item of flat) {
    const node: TocNode = { ...item, children: [] }
    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop()
    }
    if (stack.length === 0) {
      tree.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }
    stack.push(node)
  }

  let raf = 0
  function detectActive() {
    let activeId = flat[0]?.id || ''
    for (let i = 0; i < headings.length; i++) {
      const r = headings[i].getBoundingClientRect()
      if (r.top - topOffset <= 0) {
        activeId = headings[i].id
      } else {
        break
      }
    }
    onActiveChange(activeId)
  }

  const onScroll = () => {
    if (raf) return
    raf = window.requestAnimationFrame(() => {
      detectActive()
      raf = 0
    })
  }

  detectActive()
  window.addEventListener('scroll', onScroll, { passive: true })

  const destroy = () => {
    window.removeEventListener('scroll', onScroll)
    if (raf) {
      window.cancelAnimationFrame(raf)
      raf = 0
    }
  }

  return { tree, flat, destroy }
}
