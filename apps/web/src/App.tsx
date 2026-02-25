import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { Home } from './pages/Home'
import { Blog } from './pages/Blog'
import { BlogPost } from './pages/BlogPost'
import { UnderConstruction } from './pages/UnderConstruction'
import { Timeline } from './pages/Timeline'
import { NotFound } from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="life" element={<UnderConstruction />} />
          <Route path="movies" element={<UnderConstruction />} />
          <Route path="games" element={<UnderConstruction />} />
          <Route path="links" element={<UnderConstruction />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
