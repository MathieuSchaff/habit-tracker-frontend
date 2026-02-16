import { Outlet } from '@tanstack/react-router'

import { Header } from '../Header/Header'
export const AppLayout = () => {
  return (
    <div className="app-layout">
      <Header />
      <div className="content">
        <Outlet />
      </div>
    </div>
  )
}
