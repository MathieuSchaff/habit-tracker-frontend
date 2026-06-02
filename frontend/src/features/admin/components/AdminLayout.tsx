import { Link, Outlet } from '@tanstack/react-router'
import { Flag, Gauge, PackageCheck, PencilLine, Shield, UserCheck, Users } from 'lucide-react'

import { useAuthStore } from '@/store/auth'
import '@/features/admin/admin.css'

import { adminLabels } from '../constants'

export function AdminLayout() {
  // Dashboard + Utilisateurs are account/structure surfaces → admin-only. A
  // contributor (« modérateur ») sees the content surfaces: Signalements + Corrections (ADR-0006).
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
          {isAdmin && (
            <Link
              to="/admin/role-requests"
              className="admin-sidebar__link"
              activeProps={{ className: 'admin-sidebar__link is-active' }}
            >
              <UserCheck size={16} aria-hidden="true" />
              <span>{adminLabels.navRoleRequests}</span>
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
          <Link
            to="/admin/catalog"
            className="admin-sidebar__link"
            activeProps={{ className: 'admin-sidebar__link is-active' }}
          >
            <PackageCheck size={16} aria-hidden="true" />
            <span>{adminLabels.navCatalog}</span>
          </Link>
          <Link
            to="/admin/suggested-edits"
            className="admin-sidebar__link"
            activeProps={{ className: 'admin-sidebar__link is-active' }}
          >
            <PencilLine size={16} aria-hidden="true" />
            <span>{adminLabels.navSuggestedEdits}</span>
          </Link>
        </nav>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
