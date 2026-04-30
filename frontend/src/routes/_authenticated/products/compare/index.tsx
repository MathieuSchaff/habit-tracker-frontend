import { createFileRoute } from '@tanstack/react-router'

import { ComparisonsListPage } from '@/features/products/comparison/pages/ComparisonsListPage'

export const Route = createFileRoute('/_authenticated/products/compare/')({
  component: ComparisonsListPage,
})
