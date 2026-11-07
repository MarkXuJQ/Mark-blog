export function observeWindowResize(callback: () => void) {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

export function waitForScrollerReady(
  scroller: Element | Window,
  readyEvent?: string,
) {
  if (!readyEvent || scroller !== window) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    window.addEventListener(readyEvent, () => resolve(), { once: true })
  })
}
