import { Outlet } from 'react-router-dom'
import { getImageUrl } from '../utils/image'
// import { cn } from '../utils/cn'

export function HomeLayout() {
  return (
    <>
      {/* Home Specific Background - Day Mode */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-100 transition-opacity duration-700 dark:opacity-0"
        style={{ backgroundImage: `url("${getImageUrl('/images/day.png')}")` }}
      />

      {/* Home Specific Background - Night Mode */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-0 transition-opacity duration-700 dark:opacity-100"
        style={{
          backgroundImage: `url("${getImageUrl('/images/night.png')}")`,
        }}
      />
      <div className="fixed inset-0 z-0 bg-white/40 backdrop-blur-md transition-colors duration-500 dark:bg-black/50" />

      {/* Content Container - Vertically Centered */}
      <div className="relative z-10 flex min-h-[calc(100vh-140px)] flex-col items-center justify-center pt-20 pb-20 text-center">
        <Outlet />
      </div>
    </>
  )
}
