import { createFileRoute } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { IngredientInfoTab } from '@/features/ingredients/components/IngredientInfoTab'
import { IngredientInfoSkeleton } from '@/features/ingredients/components/skeletons/IngredientLayoutSkeleton'
import { ingredientQueries } from '@/lib/queries/ingredients'

export const Route = createFileRoute('/ingredients/$slug/')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(ingredientQueries.bySlug(params.slug)),
  pendingComponent: IngredientInfoSkeleton,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} is404 />,
  component: IngredientInfoTab,
})
