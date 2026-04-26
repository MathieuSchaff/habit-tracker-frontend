import { createFileRoute } from '@tanstack/react-router'

import { IngredientEditPage } from '@/features/ingredients/components/IngredientEditPage'
import { IngredientInfoSkeleton } from '@/features/ingredients/components/skeletons/IngredientLayoutSkeleton'
import { requireAuth } from '@/lib/auth/requireAuth'
import { ingredientQueries } from '@/lib/queries/ingredients'

// Trailing `_` on $slug_ opts this route out of $slug.tsx (IngredientLayout)
// so the edit page does not inherit the parent's hero/tabs/top actions.
export const Route = createFileRoute('/ingredients/$slug_/edit')({
  beforeLoad: async ({ context, location }) => {
    await requireAuth({
      queryClient: context.queryClient,
      pathname: location.pathname,
      accessToken: context.auth.accessToken,
    })
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(ingredientQueries.bySlug(params.slug)),
  pendingComponent: IngredientInfoSkeleton,
  component: IngredientEditPage,
})
