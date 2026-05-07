import { createFileRoute } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { ComparisonBuilderPage } from '@/features/products/comparison/pages/ComparisonBuilderPage'
import { comparisonQueries } from '@/lib/queries/comparisons'

export const Route = createFileRoute('/_authenticated/products/compare/$id')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(comparisonQueries.detail(params.id)),
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} is404 />,
  component: function ComparisonDetailRoute() {
    const { id } = Route.useParams()
    return <ComparisonBuilderPage mode="edit" id={id} />
  },
})
