export function clearSearchHighlights(container: HTMLElement) {
  const marks = Array.from(
    container.querySelectorAll('mark[data-search-highlight="true"]')
  )
  for (const mark of marks) {
    const text = document.createTextNode(mark.textContent || '')
    mark.replaceWith(text)
  }
  container.normalize()
}

export function applySearchHighlights(
  container: HTMLElement,
  query: string
): HTMLElement[] {
  const q = query.trim()
  if (!q) return []

  clearSearchHighlights(container)

  const highlights: HTMLElement[] = []
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const queryLower = q.toLowerCase()

  const textNodes: Text[] = []
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node instanceof Text) textNodes.push(node)
  }

  for (const node of textNodes) {
    const original = node.nodeValue
    if (!original) continue
    const lower = original.toLowerCase()

    let from = 0
    let idx = lower.indexOf(queryLower, from)
    if (idx === -1) continue

    const fragment = document.createDocumentFragment()
    while (idx !== -1) {
      const before = original.slice(from, idx)
      if (before) fragment.appendChild(document.createTextNode(before))

      const matchedText = original.slice(idx, idx + q.length)
      const mark = document.createElement('mark')
      mark.setAttribute('data-search-highlight', 'true')
      mark.className =
        'rounded bg-yellow-200/80 px-0.5 text-slate-900 dark:bg-yellow-300/70'
      mark.textContent = matchedText
      fragment.appendChild(mark)
      highlights.push(mark)

      from = idx + Math.max(1, q.length)
      idx = lower.indexOf(queryLower, from)
    }

    const after = original.slice(from)
    if (after) fragment.appendChild(document.createTextNode(after))
    node.replaceWith(fragment)
  }

  return highlights
}

