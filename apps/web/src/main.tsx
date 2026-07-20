import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './i18n'
import './assets/styles/global.css'
import 'lenis/dist/lenis.css'
import App, { preloadCurrentRoute } from './App.tsx'

declare global {
  interface Window {
    __HYDRATING_PRERENDER__?: boolean
  }
}

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
)

async function renderApp() {
  if (container.hasChildNodes()) {
    window.__HYDRATING_PRERENDER__ = true
    await preloadCurrentRoute(window.location.pathname)
    const shouldReportHydrationErrors =
      import.meta.env.MODE === 'development' ||
      new URLSearchParams(window.location.search).has('debugHydration')
    hydrateRoot(
      container,
      app,
      shouldReportHydrationErrors
        ? {
            onRecoverableError(error, errorInfo) {
              console.error(
                '[hydration-recoverable]',
                error,
                errorInfo.componentStack
              )
            },
          }
        : undefined
    )
    return
  }

  createRoot(container).render(app)
}

void renderApp()
