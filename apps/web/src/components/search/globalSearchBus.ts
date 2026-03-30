export type GlobalSearchState = {
  open: boolean
  query?: string
}

type GlobalSearchListener = (state: GlobalSearchState) => void

const listeners = new Set<GlobalSearchListener>()

let currentState: GlobalSearchState = { open: false }

function notifyListeners() {
  listeners.forEach((listener) => {
    listener(currentState)
  })
}

export function getGlobalSearchState() {
  return currentState
}

export function subscribeGlobalSearch(
  listener: GlobalSearchListener,
  options?: { replayCurrent?: boolean }
) {
  listeners.add(listener)

  if (options?.replayCurrent) {
    listener(currentState)
  }

  return () => {
    listeners.delete(listener)
  }
}

export function openGlobalSearch(query?: string) {
  currentState = { open: true, query }
  notifyListeners()
}

export function closeGlobalSearch() {
  currentState = { open: false }
  notifyListeners()
}
