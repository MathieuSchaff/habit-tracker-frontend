import { createFileRoute } from '@tanstack/react-router'

import { ComparisonBuilderPage } from '@/features/products/comparison/pages/ComparisonBuilderPage'
import { comparisonQueries } from '@/lib/queries/comparisons'

export const Route = createFileRoute('/_authenticated/products/compare/$id')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(comparisonQueries.detail(params.id)),
  component: function ComparisonDetailRoute() {
    const { id } = Route.useParams()
    return <ComparisonBuilderPage mode="edit" id={id} />
  },
})
