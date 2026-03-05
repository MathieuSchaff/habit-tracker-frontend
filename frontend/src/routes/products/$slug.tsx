import { createFileRoute } from '@tanstack/react-router'

import { ProductPage } from '../../component/pages/Product/ProductPage'
import { productQueries } from '../../lib/queries/products'

export const Route = createFileRoute('/products/$slug')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueries.bySlug(params.slug)),

  errorComponent: () => <div>Produit introuvable</div>,

  pendingComponent: () => <div>Chargement...</div>,

  component: ProductPage,
})
