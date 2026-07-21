import { createFileRoute, notFound } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { IngredientLayout } from '@/features/ingredients/components/IngredientLayout/IngredientLayout'
import { IngredientLayoutSkeleton } from '@/features/ingredients/components/skeletons/IngredientLayoutSkeleton'
import { ApiError } from '@/lib/helpers/apiError'
import { ingredientQueries } from '@/lib/queries/ingredients'

export const Route = createFileRoute('/ingredients/$slug')({
  ssr: true,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(ingredientQueries.bySlug(params.slug)).catch((err) => {
      // A missing ingredient is a 404, not a render error: route it to notFoundComponent
      // so 5xx/429 keep the real error UI instead of a misleading "page not found".
      if (err instanceof ApiError && err.status === 404) throw notFound()
      throw err
    }),
  notFoundComponent: () => <GlobalError error={new Error('not_found')} is404 />,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
  pendingComponent: IngredientLayoutSkeleton,
  component: IngredientLayout,
})
