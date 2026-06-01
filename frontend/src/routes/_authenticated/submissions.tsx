import { createFileRoute } from '@tanstack/react-router'

import { Spinner } from '../../component/Feedback/ui/Spinner/Spinner'
import { SubmissionsDashboard } from '../../features/catalog-submissions/page/SubmissionsDashboard'
import { catalogSubmissionQueries } from '../../lib/queries/catalog-submissions'

export const Route = createFileRoute('/_authenticated/submissions')({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogSubmissionQueries.mine()),
  pendingComponent: () => <Spinner />,
  errorComponent: () => <p>Impossible de charger vos soumissions.</p>,
  component: SubmissionsDashboard,
})
