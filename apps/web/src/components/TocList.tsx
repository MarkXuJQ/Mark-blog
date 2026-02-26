import { cn } from '../utils/cn'

interface TocListProps {
  toc: Array<{ id: string; text: string; level: number }>
  activeId: string
}

export function TocList({ toc, activeId }: TocListProps) {
  type Node = { id: string; text: string; level: number; children: Node[] }
  const stack: Node[] = []
  const tree: Node[] = []
  
  for (const item of toc) {
    const node: Node = { ...item, children: [] }
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

  function hasActive(node: Node): boolean {
    if (node.id === activeId) return true
    for (const c of node.children) {
      if (hasActive(c)) return true
    }
    return false
  }

  function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 100 // Offset for sticky header
      window.scrollTo({ top, behavior: 'smooth' })
      // Update URL hash without scrolling
      window.history.pushState({}, '', `#${id}`)
    }
  }

  function render(nodes: Node[]) {
    return nodes.map((n) => (
      <li
        key={n.id}
        className={cn(
          "list-none",
          "opacity-60 hover:opacity-95",
          (hasActive(n) || n.id === activeId) && "opacity-100"
        )}
      >
        <a
          href={`#${n.id}`}
          onClick={(e) => handleLinkClick(e, n.id)}
          className={cn(
            n.id === activeId ? styles.tocItemActive : styles.tocItem,
            n.level > 1 && "border-l border-slate-200 dark:border-slate-800"
          )}
          style={{ paddingLeft: `${(n.level - 1) * 14}px` }}
        >
          {n.text}
        </a>
        {n.children.length > 0 && (
          <ol className="mt-1 space-y-1">
            {render(n.children)}
          </ol>
        )}
      </li>
    ))
  }

  return <ol className="space-y-1">{render(tree)}</ol>
}

const styles = {
  tocItem: cn(
    "relative block overflow-hidden rounded-md px-2 py-1 text-sm truncate",
    "text-slate-700 hover:text-blue-600 cursor-pointer transition-colors",
    "dark:text-slate-300 dark:hover:text-blue-400"
  ),
  tocItemActive: cn(
    "relative text-blue-600 font-semibold",
    "dark:text-blue-400"
  )
}
