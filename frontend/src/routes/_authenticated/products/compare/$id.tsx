import { createFileRoute, notFound } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { ComparisonBuilderPage } from '@/features/products/comparison/pages/ComparisonBuilderPage'
import { ApiError } from '@/lib/helpers/apiError'
import { comparisonQueries } from '@/lib/queries/comparisons'

export const Route = createFileRoute('/_authenticated/products/compare/$id')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(comparisonQueries.detail(params.id)).catch((err) => {
      // Missing comparison = 404 → notFoundComponent; keep 5xx/429 on the real error UI.
      if (err instanceof ApiError && err.status === 404) throw notFound()
      throw err
    }),
  notFoundComponent: () => <GlobalError error={new Error('not_found')} is404 />,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
  component: function ComparisonDetailRoute() {
    const { id } = Route.useParams()
    return <ComparisonBuilderPage mode="edit" id={id} />
  },
})
