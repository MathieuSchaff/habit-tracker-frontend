import { createFileRoute } from '@tanstack/react-router'

import { IngredientLayout } from '@/features/ingredients/components/IngredientLayout'
import { IngredientLayoutSkeleton } from '@/features/ingredients/components/skeletons/IngredientLayoutSkeleton'
import { ingredientQueries } from '@/lib/queries/ingredients'

export const Route = createFileRoute('/ingredients/$slug')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(ingredientQueries.bySlug(params.slug)),
  errorComponent: () => <div>Ingredient introuvable</div>,
  pendingComponent: IngredientLayoutSkeleton,
  component: IngredientLayout,
})
