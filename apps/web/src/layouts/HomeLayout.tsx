import { Outlet } from 'react-router-dom'
// import { cn } from '../utils/cn'

export function HomeLayout() {
  return (
    <>
      {/* Home Specific Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/images/image1.jpg")' }} 
      />
      <div className="fixed inset-0 z-0 bg-white/60 backdrop-blur-md transition-colors duration-500 dark:bg-black/50" />

      {/* Content Container - Vertically Centered */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center pt-20 pb-20 min-h-[calc(100vh-140px)]">
        <Outlet />
      </div>
    </>
  )
}
