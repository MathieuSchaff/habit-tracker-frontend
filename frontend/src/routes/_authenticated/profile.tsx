import { createFileRoute } from '@tanstack/react-router'

import { Spinner } from '../../component/Feedback/Spinner/Spinner'
import { ProfileDashboard } from '../../component/Profile/ProfileDashboard/ProfileDashboard'
import { profileQueries } from '../../lib/queries/profile'

export const Route = createFileRoute('/_authenticated/profile')({
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQueries.me()),
  pendingComponent: () => (
    <div className="profile-loading">
      <Spinner />
    </div>
  ),
  errorComponent: () => (
    <div className="profile-error">
      <p>Impossible de charger le profil.</p>
    </div>
  ),
  component: ProfilePage,
})

function ProfilePage() {
  return <ProfileDashboard />
}
