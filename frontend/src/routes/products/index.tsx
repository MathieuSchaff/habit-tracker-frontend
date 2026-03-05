import { createFileRoute } from '@tanstack/react-router'

import { ProductsPage } from '../../component/pages/Products/ProductsPage'

export const Route = createFileRoute('/products/')({
  component: ProductsPage,
})
