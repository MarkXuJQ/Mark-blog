import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { HomeLayout } from './layouts/HomeLayout'
import { DeferredVercelInsights } from './components/analytics/DeferredVercelInsights'

const LightboxProvider = lazy(() =>
  import('./components/ui/Lightbox').then((module) => ({
    default: module.LightboxProvider,
  }))
)
const BlogLayout = lazy(() =>
  import('./layouts/BlogLayout').then((module) => ({
    default: module.BlogLayout,
  }))
)
const Home = lazy(() =>
  import('./pages/Home').then((module) => ({ default: module.Home }))
)
const Blog = lazy(() =>
  import('./pages/Blog').then((module) => ({ default: module.Blog }))
)
const BlogPost = lazy(() =>
  import('./pages/BlogPost').then((module) => ({ default: module.BlogPost }))
)
const UnderConstruction = lazy(() =>
  import('./pages/UnderConstruction').then((module) => ({
    default: module.UnderConstruction,
  }))
)
const Timeline = lazy(() =>
  import('./pages/Timeline').then((module) => ({ default: module.Timeline }))
)
const Archive = lazy(() =>
  import('./pages/Archive').then((module) => ({ default: module.Archive }))
)
const About = lazy(() =>
  import('./pages/About').then((module) => ({ default: module.About }))
)
const Life = lazy(() =>
  import('./pages/Life').then((module) => ({ default: module.Life }))
)
const NotFound = lazy(() =>
  import('./pages/NotFound').then((module) => ({ default: module.NotFound }))
)

function RouteLoading() {
  return (
    <div
      data-prerender-fallback="true"
      className="mx-auto w-full max-w-3xl px-4 py-12 text-center text-slate-500 dark:text-slate-400"
    >
      Loading...
    </div>
  )
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>
}

function App() {
  return (
    <>
      <BrowserRouter>
        <DeferredVercelInsights />
        <Routes>
          {/* Main Layout Routes - Handles Home, Blog, and all other pages */}
          <Route element={<RootLayout />}>
            {/* Nested Home Layout */}
            <Route element={<HomeLayout />}>
              <Route
                path="/"
                element={
                  <LazyRoute>
                    <Home />
                  </LazyRoute>
                }
              />
            </Route>

            {/* Blog Layout - Three columns with fixed sidebars */}
            <Route
              element={
                <LazyRoute>
                  <BlogLayout />
                </LazyRoute>
              }
            >
              <Route
                path="blog"
                element={
                  <LazyRoute>
                    <Blog />
                  </LazyRoute>
                }
              />
              <Route
                path="blog/:slug"
                element={
                  <LazyRoute>
                    <LightboxProvider>
                      <BlogPost />
                    </LightboxProvider>
                  </LazyRoute>
                }
              />
              <Route
                path="archive"
                element={
                  <LazyRoute>
                    <Archive />
                  </LazyRoute>
                }
              />
            </Route>
            <Route
              path="timeline"
              element={
                <LazyRoute>
                  <Timeline />
                </LazyRoute>
              }
            />
            <Route
              path="about"
              element={
                <LazyRoute>
                  <About />
                </LazyRoute>
              }
            />
            <Route
              path="life"
              element={
                <LazyRoute>
                  <LightboxProvider>
                    <Life />
                  </LightboxProvider>
                </LazyRoute>
              }
            />
            <Route
              path="movies"
              element={
                <LazyRoute>
                  <UnderConstruction />
                </LazyRoute>
              }
            />
            <Route
              path="games"
              element={
                <LazyRoute>
                  <UnderConstruction />
                </LazyRoute>
              }
            />
            <Route
              path="links"
              element={
                <LazyRoute>
                  <UnderConstruction />
                </LazyRoute>
              }
            />
            <Route
              path="*"
              element={
                <LazyRoute>
                  <NotFound />
                </LazyRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
