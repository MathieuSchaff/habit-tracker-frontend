import { Link, Outlet } from '@tanstack/react-router'
import { Flag, Gauge, Shield, Users } from 'lucide-react'

import { useAuthStore } from '@/store/auth'
import '@/features/admin/admin.css'

export function AdminLayout() {
  // Dashboard + Utilisateurs are account/structure surfaces → admin-only. A
  // contributor (« modérateur ») sees only Signalements (ADR-0006 S1).
  const isAdmin = useAuthStore((state) => state.role === 'admin')
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Navigation admin">
        <header className="admin-sidebar__brand">
          <Shield size={18} aria-hidden="true" />
          <span>Modération</span>
        </header>
        <nav className="admin-sidebar__nav">
          {isAdmin && (
            <Link
              to="/admin"
              className="admin-sidebar__link"
              activeProps={{ className: 'admin-sidebar__link is-active' }}
              activeOptions={{ exact: true }}
            >
              <Gauge size={16} aria-hidden="true" />
              <span>Tableau de bord</span>
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin/users"
              className="admin-sidebar__link"
              activeProps={{ className: 'admin-sidebar__link is-active' }}
            >
              <Users size={16} aria-hidden="true" />
              <span>Utilisateurs</span>
            </Link>
          )}
          <Link
            to="/admin/reports"
            className="admin-sidebar__link"
            activeProps={{ className: 'admin-sidebar__link is-active' }}
          >
            <Flag size={16} aria-hidden="true" />
            <span>Signalements</span>
          </Link>
        </nav>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
