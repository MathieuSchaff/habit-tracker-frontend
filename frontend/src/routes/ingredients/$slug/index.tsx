import { createFileRoute, notFound } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { IngredientInfoTab } from '@/features/ingredients/components/IngredientInfoTab/IngredientInfoTab'
import { IngredientInfoSkeleton } from '@/features/ingredients/components/skeletons/IngredientLayoutSkeleton'
import { ApiError } from '@/lib/helpers/apiError'
import { ingredientQueries } from '@/lib/queries/ingredients'

export const Route = createFileRoute('/ingredients/$slug/')({
  loader: async ({ context, params }) => {
    const { queryClient } = context
    // Hoisted from post-mount into the loader to kill the serial RTT after the detail.
    // products keys on the slug alone → start it in parallel with bySlug; tags needs the id.
    // Non-critical (products list + tag pills) → swallow so a secondary failure can't error the page.
    const products = queryClient
      .ensureQueryData(ingredientQueries.products(params.slug))
      .catch(() => null)
    const ingredient = await queryClient
      .ensureQueryData(ingredientQueries.bySlug(params.slug))
      .catch((err) => {
        // Missing ingredient = 404 → notFoundComponent; keep 5xx/429 on the real error UI.
        if (err instanceof ApiError && err.status === 404) throw notFound()
        throw err
      })
    await Promise.all([
      products,
      queryClient.ensureQueryData(ingredientQueries.tags(ingredient.id)).catch(() => null),
    ])
    return ingredient
  },
  pendingComponent: IngredientInfoSkeleton,
  notFoundComponent: () => <GlobalError error={new Error('not_found')} is404 />,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
  component: IngredientInfoTab,
})
