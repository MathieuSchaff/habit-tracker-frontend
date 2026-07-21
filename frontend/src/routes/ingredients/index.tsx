import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { ingredientsSearchDefaults, ingredientsSearchSchema } from '@/features/ingredients/filters'
import { seoHead } from '@/lib/seo'
import { IngredientsPage } from '../../features/ingredients/page/IngredientsPage/IngredientsPage'

export const Route = createFileRoute('/ingredients/')({
  // SSR the hub so the bare path ships index,follow + canonical in the server HTML
  // instead of inheriting the root's noindex until hydration. Filtered variants
  // stay on the same route and consolidate to this canonical.
  ssr: true,
  validateSearch: ingredientsSearchSchema,
  search: {
    middlewares: [stripSearchParams(ingredientsSearchDefaults)],
  },
  head: () =>
    seoHead({
      path: '/ingredients',
      title: 'Ingrédients — Aurore',
      description:
        'Parcourez les ingrédients cosmétiques : leur rôle dans une formule et les produits qui en contiennent, à lire au calme sur Aurore.',
    }),
  component: IngredientsPage,
})
