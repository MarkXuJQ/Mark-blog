export function openGlobalSearch(query?: string) {
  window.dispatchEvent(
    new CustomEvent('app:global-search', { detail: { open: true, query } })
  )
}

export function closeGlobalSearch() {
  window.dispatchEvent(new CustomEvent('app:global-search', { detail: { open: false } }))
}

