import { Outlet } from 'react-router-dom'

export function HomeLayout() {
  return (
    <div className="relative z-10 flex min-h-screen flex-col overflow-x-clip">
      <Outlet />
    </div>
  )
}
