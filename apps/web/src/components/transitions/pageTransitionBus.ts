export type PageTransitionRequest = {
  id: number
  to: string
}

type PageTransitionListener = (request: PageTransitionRequest) => void

const listeners = new Set<PageTransitionListener>()

let pendingRequest: PageTransitionRequest | null = null
let nextRequestId = 1

function notifyListeners(request: PageTransitionRequest) {
  listeners.forEach((listener) => {
    listener(request)
  })
}

export function getPendingPageTransition() {
  return pendingRequest
}

export function clearPendingPageTransition(id: number) {
  if (pendingRequest?.id === id) {
    pendingRequest = null
  }
}

export function subscribePageTransition(
  listener: PageTransitionListener,
  options?: { replayPending?: boolean }
) {
  listeners.add(listener)

  if (options?.replayPending && pendingRequest) {
    listener(pendingRequest)
  }

  return () => {
    listeners.delete(listener)
  }
}

export function requestPageTransition(to: string) {
  const request = {
    id: nextRequestId++,
    to,
  }

  pendingRequest = request
  notifyListeners(request)
}
