import { Outlet, useRouterState } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { BottomNav } from '../../BottomNav/BottomNav'
import { Header } from '../Header/Header'

export const AppLayout = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAuthRoute = ['/login', '/signup', '/verify-email', '/verify-pending'].includes(pathname)

  return (
    <div className="app-layout">
      {!isAuthRoute && <Header />}
      <div className={`content ${isAuthRoute ? 'content--auth' : ''}`}>
        <Outlet />
      </div>
      {!isAuthRoute && <BottomNav />}
      <Toaster position="top-center" richColors />
    </div>
  )
}
