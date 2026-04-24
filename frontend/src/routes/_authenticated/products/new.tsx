import { createFileRoute } from '@tanstack/react-router'

import { ProductCreatePage } from '../../../features/products/components/ProductCreatePage'

export const Route = createFileRoute('/_authenticated/products/new')({
  component: ProductCreatePage,
})
