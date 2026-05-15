import { createFileRoute } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

import { ComparisonBuilderPage } from '@/features/products/comparison/pages/ComparisonBuilderPage'

const searchSchema = z.object({
  seed: z.uuid().optional(),
})

export const Route = createFileRoute('/_authenticated/products/compare/new')({
  validateSearch: zodValidator(searchSchema),
  component: function NewComparisonRoute() {
    const { seed } = Route.useSearch()
    return <ComparisonBuilderPage mode="new" seedProductId={seed} />
  },
})
