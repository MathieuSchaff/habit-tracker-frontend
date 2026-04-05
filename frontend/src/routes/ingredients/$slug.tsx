import { createFileRoute } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/GlobalError/GlobalError'
import { IngredientLayout } from '@/features/ingredients/components/IngredientLayout'
import { IngredientLayoutSkeleton } from '@/features/ingredients/components/skeletons/IngredientLayoutSkeleton'
import { ingredientQueries } from '@/lib/queries/ingredients'

export const Route = createFileRoute('/ingredients/$slug')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(ingredientQueries.bySlug(params.slug)),
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} is404 />,
  pendingComponent: IngredientLayoutSkeleton,
  component: IngredientLayout,
})
