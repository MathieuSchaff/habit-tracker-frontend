import { createFileRoute } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { Spinner } from '@/component/Feedback/ui/Spinner/Spinner'
import { PublicProfilePage } from '@/features/profile/page/PublicProfile/PublicProfilePage'
import { profileQueries } from '@/lib/queries/profile'

export const Route = createFileRoute('/u/$username')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(profileQueries.publicByUsername(params.username)),
  errorComponent: ({ error, reset }) => (
    <GlobalError error={error} reset={reset} is404={error.message === 'not_found'} />
  ),
  pendingComponent: () => <Spinner />,
  component: PublicProfileRouteComponent,
})

function PublicProfileRouteComponent() {
  const { username } = Route.useParams()
  return <PublicProfilePage username={username} />
}
