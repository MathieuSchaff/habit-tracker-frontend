import { createFileRoute } from '@tanstack/react-router'

import { ProductCreatePage } from '@/features/products/pages/ProductCreatePage/ProductCreatePage'

// name/brand prefill the form when resubmitting after a takedown (SubmissionsDashboard).
type ProductNewSearch = { name?: string; brand?: string }

export const Route = createFileRoute('/_authenticated/products/new')({
  validateSearch: (search: Record<string, unknown>): ProductNewSearch => ({
    name: typeof search.name === 'string' ? search.name : undefined,
    brand: typeof search.brand === 'string' ? search.brand : undefined,
  }),
  component: ProductCreatePage,
})
