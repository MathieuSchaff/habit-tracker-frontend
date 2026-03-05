import { Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { Header } from '../Header/Header'
export const AppLayout = () => {
  return (
    <div className="app-layout">
      <Header />
      <div className="content">
        <Outlet />
      </div>
      <Toaster position="bottom-center" richColors />
    </div>
  )
}
