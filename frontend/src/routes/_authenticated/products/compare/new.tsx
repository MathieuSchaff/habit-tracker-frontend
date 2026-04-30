import { createFileRoute } from '@tanstack/react-router'

import { ComparisonBuilderPage } from '@/features/products/comparison/pages/ComparisonBuilderPage'

export const Route = createFileRoute('/_authenticated/products/compare/new')({
  component: () => <ComparisonBuilderPage mode="new" />,
})
