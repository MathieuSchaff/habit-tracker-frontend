import { createFileRoute } from '@tanstack/react-router'

import { IngredientPage } from '../../component/pages/Ingredient/IngredientPage'
import { ingredientQueries } from '../../lib/queries/ingredients'

export const Route = createFileRoute('/ingredients/$slug')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(ingredientQueries.bySlug(params.slug)),

  errorComponent: () => <div>Ingrédient introuvable</div>,

  pendingComponent: () => <div>Chargement...</div>,

  component: IngredientPage,
})
