import { createFileRoute } from '@tanstack/react-router'

import { IngredientEditPage } from '@/features/ingredients/components/IngredientEditPage'
import { IngredientInfoSkeleton } from '@/features/ingredients/components/skeletons/IngredientLayoutSkeleton'
import { requireAuth } from '@/lib/auth/requireAuth'
import { ingredientQueries } from '@/lib/queries/ingredients'

// Cannot move under /_authenticated: must stay under /ingredients/$slug to render inside IngredientLayout's Outlet
export const Route = createFileRoute('/ingredients/$slug/edit')({
  beforeLoad: async ({ context, location }) => {
    await requireAuth({ queryClient: context.queryClient, pathname: location.pathname, accessToken: context.auth.accessToken })
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(ingredientQueries.bySlug(params.slug)),
  pendingComponent: IngredientInfoSkeleton,
  component: IngredientEditPage,
})
