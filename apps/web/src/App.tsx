import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { LightboxProvider } from './components/ui/Lightbox'
import { RootLayout } from './layouts/RootLayout'
import { HomeLayout } from './layouts/HomeLayout'
import { BlogLayout } from './layouts/BlogLayout'

import { Home } from './pages/Home'
import { Blog } from './pages/Blog'
import { BlogPost } from './pages/BlogPost'

import { UnderConstruction } from './pages/UnderConstruction'
import { Timeline } from './pages/Timeline'
import { Archive } from './pages/Archive'
import { About } from './pages/About'
import { NotFound } from './pages/NotFound'

function App() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
      <LightboxProvider>
        <BrowserRouter>
          <Routes>
            {/* Main Layout Routes - Handles Home, Blog, and all other pages */}
            <Route element={<RootLayout />}>
              {/* Nested Home Layout */}
              <Route element={<HomeLayout />}>
                <Route path="/" element={<Home />} />
              </Route>

              {/* Blog Layout - Three columns with fixed sidebars */}
              <Route element={<BlogLayout />}>
                <Route path="blog" element={<Blog />} />
                <Route path="blog/:slug" element={<BlogPost />} />
                <Route path="archive" element={<Archive />} />
              </Route>
              <Route path="timeline" element={<Timeline />} />
              <Route path="about" element={<About />} />
              <Route path="life" element={<UnderConstruction />} />
              <Route path="movies" element={<UnderConstruction />} />
              <Route path="games" element={<UnderConstruction />} />
              <Route path="links" element={<UnderConstruction />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LightboxProvider>
    </>
  )
}

export default App
