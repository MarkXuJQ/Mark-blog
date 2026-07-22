import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { HomeLayout } from './layouts/HomeLayout'
import { DeferredVercelInsights } from './app/analytics/DeferredVercelInsights'
import { createPreloadableComponent } from './app/routing/createPreloadableComponent'
import { normalizePathname } from './app/routing/normalizePathname'

const LightboxProvider = createPreloadableComponent(() =>
  import('./components/ui/Lightbox').then((module) => module.LightboxProvider)
)
const ArchiveLayout = createPreloadableComponent(() =>
  import('./layouts/ArchiveLayout').then((module) => module.ArchiveLayout)
)
const BlogListLayout = createPreloadableComponent(() =>
  import('./layouts/BlogListLayout').then((module) => module.BlogListLayout)
)
const BlogPostLayout = createPreloadableComponent(() =>
  import('./layouts/BlogPostLayout').then((module) => module.BlogPostLayout)
)
const SmoothScrollProvider = createPreloadableComponent(() =>
  import('./app/providers/SmoothScrollProvider').then(
    (module) => module.SmoothScrollProvider
  )
)
const Home = createPreloadableComponent(() =>
  import('./pages/Home').then((module) => module.Home)
)
const Blog = createPreloadableComponent(() =>
  import('./pages/Blog').then((module) => module.Blog)
)
const BlogPost = createPreloadableComponent(() =>
  import('./pages/BlogPost').then((module) => module.BlogPost)
)
const Timeline = createPreloadableComponent(() =>
  import('./pages/Timeline').then((module) => module.Timeline)
)
const Archive = createPreloadableComponent(() =>
  import('./pages/Archive').then((module) => module.Archive)
)
const About = createPreloadableComponent(() =>
  import('./pages/About').then((module) => module.About)
)
const Life = createPreloadableComponent(() =>
  import('./pages/Life').then((module) => module.Life)
)
const Movies = createPreloadableComponent(() =>
  import('./pages/Movies').then((module) => module.Movies)
)
const MovieReviewPost = createPreloadableComponent(() =>
  import('./pages/MovieReviewPost').then((module) => module.MovieReviewPost)
)
const Games = createPreloadableComponent(() =>
  import('./pages/Games').then((module) => module.Games)
)
const Search = createPreloadableComponent(() =>
  import('./pages/Search').then((module) => module.Search)
)
const Links = createPreloadableComponent(() =>
  import('./pages/Links').then((module) => module.Links)
)
const NotFound = createPreloadableComponent(() =>
  import('./pages/NotFound').then((module) => module.NotFound)
)

// Hydration needs the same preload registry used by these route components.
// eslint-disable-next-line react-refresh/only-export-components
export async function preloadCurrentRoute(pathname: string) {
  const normalizedPathname = normalizePathname(pathname)
  const routeComponents = (() => {
    if (normalizedPathname === '/') return [SmoothScrollProvider, Home]
    if (normalizedPathname === '/blog') return [BlogListLayout, Blog]
    if (normalizedPathname.startsWith('/blog/')) {
      return [BlogPostLayout, LightboxProvider, BlogPost]
    }
    if (normalizedPathname === '/archive') return [ArchiveLayout, Archive]
    if (normalizedPathname === '/links') return [ArchiveLayout, Links]
    if (normalizedPathname === '/timeline') return [Timeline]
    if (normalizedPathname === '/search') return [Search]
    if (normalizedPathname === '/about') return [About]
    if (normalizedPathname === '/life') return [LightboxProvider, Life]
    if (normalizedPathname === '/movies') return [Movies]
    if (normalizedPathname.startsWith('/movies/reviews/')) {
      return [MovieReviewPost]
    }
    if (normalizedPathname === '/games') return [Games]
    return [NotFound]
  })()

  await Promise.all(routeComponents.map((component) => component.preload()))
}

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
  const [shouldUseSuspense, setShouldUseSuspense] = useState(
    () => !window.__HYDRATING_PRERENDER__
  )

  useEffect(() => {
    window.__HYDRATING_PRERENDER__ = false
    setShouldUseSuspense(true)
  }, [])

  if (!shouldUseSuspense) return children

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
            <Route
              element={
                <LazyRoute>
                  <SmoothScrollProvider>
                    <HomeLayout />
                  </SmoothScrollProvider>
                </LazyRoute>
              }
            >
              <Route
                path="/"
                element={
                  <LazyRoute>
                    <Home />
                  </LazyRoute>
                }
              />
            </Route>

            {/* Blog List Layout */}
            <Route
              element={
                <LazyRoute>
                  <BlogListLayout />
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
            </Route>

            {/* Blog Post Layout */}
            <Route
              element={
                <LazyRoute>
                  <BlogPostLayout />
                </LazyRoute>
              }
            >
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
            </Route>

            {/* Archive Layout */}
            <Route
              element={
                <LazyRoute>
                  <ArchiveLayout />
                </LazyRoute>
              }
            >
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
              path="search"
              element={
                <LazyRoute>
                  <Search />
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
                  <Movies />
                </LazyRoute>
              }
            />
            <Route
              path="movies/reviews/:slug"
              element={
                <LazyRoute>
                  <MovieReviewPost />
                </LazyRoute>
              }
            />
            <Route
              path="games"
              element={
                <LazyRoute>
                  <Games />
                </LazyRoute>
              }
            />
            <Route
              element={
                <LazyRoute>
                  <ArchiveLayout />
                </LazyRoute>
              }
            >
              <Route
                path="links"
                element={
                  <LazyRoute>
                    <Links />
                  </LazyRoute>
                }
              />
            </Route>
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
