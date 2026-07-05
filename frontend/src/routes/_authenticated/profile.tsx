import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

import { Spinner } from '../../component/Feedback/ui/Spinner/Spinner'
import { ProfileDashboard } from '../../features/profile/page/ProfileDashboard/ProfileDashboard'
import { PROFILE_TABS } from '../../features/profile/page/ProfileDashboard/tabs'
import { profileQueries } from '../../lib/queries/profile'
import './profile.css'

const searchSchema = z.object({
  tab: z.enum(PROFILE_TABS).default('profile').catch('profile'),
})

const defaultValues = { tab: 'profile' as const }

export const Route = createFileRoute('/_authenticated/profile')({
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(defaultValues)] },
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
