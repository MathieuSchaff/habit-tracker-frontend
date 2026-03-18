import { Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { BottomNav } from '../../BottomNav/BottomNav'
import { Header } from '../Header/Header'
export const AppLayout = () => {
  return (
    <div className="app-layout">
      <Header />
      <div className="content">
        <Outlet />
      </div>
      <BottomNav />
      <Toaster position="top-center" richColors />
    </div>
  )
}
