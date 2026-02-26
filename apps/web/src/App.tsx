import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { HomeLayout } from './layouts/HomeLayout'
import { BlogLayout } from './layouts/BlogLayout'
import { MinimalLayout } from './layouts/MinimalLayout'
import { Home } from './pages/Home'
import { Blog } from './pages/Blog'
import { BlogPost } from './pages/BlogPost'
import { ZenMode } from './pages/ZenMode'
import { UnderConstruction } from './pages/UnderConstruction'
import { Timeline } from './pages/Timeline'
import { NotFound } from './pages/NotFound'

function App() {
  return (
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
          </Route>
          <Route path="timeline" element={<Timeline />} />
          <Route path="life" element={<UnderConstruction />} />
          <Route path="movies" element={<UnderConstruction />} />
          <Route path="games" element={<UnderConstruction />} />
          <Route path="links" element={<UnderConstruction />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Minimal Layout Routes */}
        <Route element={<MinimalLayout />}>
          <Route path="/zen" element={<ZenMode />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
