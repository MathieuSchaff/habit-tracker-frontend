import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { EyeOff, Flag, Shield, UserCheck, UserX } from 'lucide-react'

import { adminQueries } from '@/lib/queries/admin'
import { adminLabels } from '../constants'

export function AdminDashboardPage() {
  const { data } = useSuspenseQuery(adminQueries.dashboard())
  const totalHidden = data.hiddenReviews + data.hiddenThreads + data.hiddenReplies

  return (
    <section>
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Tableau de bord</h1>
          <p className="admin-page__lede">Vue d’ensemble des actions de modération en cours.</p>
        </div>
      </header>

      <div className="admin-dashboard">
        <Link to="/admin/reports" className="admin-stat-card">
          <Flag size={20} aria-hidden="true" />
          <span className="admin-stat-card__value">{data.openReports}</span>
          <span className="admin-stat-card__label">{adminLabels.statOpenReports}</span>
        </Link>
        <Link to="/admin/users" className="admin-stat-card">
          <UserX size={20} aria-hidden="true" />
          <span className="admin-stat-card__value">{data.activeBans}</span>
          <span className="admin-stat-card__label">{adminLabels.statActiveBans}</span>
        </Link>
        <Link to="/admin/reports" className="admin-stat-card">
          <EyeOff size={20} aria-hidden="true" />
          <span className="admin-stat-card__value">{totalHidden}</span>
          <span className="admin-stat-card__label">
            {adminLabels.statHiddenContent}
            <em className="admin-stat-card__breakdown">
              {data.hiddenReviews} review · {data.hiddenThreads} thread · {data.hiddenReplies} reply
            </em>
          </span>
        </Link>
        <Link to="/admin/users" className="admin-stat-card">
          <Shield size={20} aria-hidden="true" />
          <span className="admin-stat-card__value">{data.forcedPrivateProfiles}</span>
          <span className="admin-stat-card__label">{adminLabels.statForcedPrivate}</span>
        </Link>
        <Link to="/admin/role-requests" className="admin-stat-card">
          <UserCheck size={20} aria-hidden="true" />
          <span className="admin-stat-card__value">{data.pendingRoleRequests}</span>
          <span className="admin-stat-card__label">{adminLabels.statPendingRoleRequests}</span>
        </Link>
      </div>
    </section>
  )
}
