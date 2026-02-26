import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { MinimalLayout } from './layouts/MinimalLayout'
import { BlogLayout } from './layouts/BlogLayout'
import { HomeLayout } from './layouts/HomeLayout'
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
        {/* Home Layout Route */}
        <Route element={<HomeLayout />}>
          <Route path="/" element={<Home />} />
        </Route>

        {/* Main Layout Routes */}
        <Route element={<RootLayout />}>
          <Route path="timeline" element={<Timeline />} />
          <Route path="life" element={<UnderConstruction />} />
          <Route path="movies" element={<UnderConstruction />} />
          <Route path="games" element={<UnderConstruction />} />
          <Route path="links" element={<UnderConstruction />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Blog Layout Routes */}
        <Route element={<BlogLayout />}>
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
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
