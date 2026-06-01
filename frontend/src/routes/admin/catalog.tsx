import { createFileRoute } from '@tanstack/react-router'

import { AdminCatalogPage } from '@/features/admin/components/AdminCatalogPage'
import { adminQueries } from '@/lib/queries/admin'

export const Route = createFileRoute('/admin/catalog')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      adminQueries.catalogQueue('product', 'unverified', 'visible')
    ),
  component: AdminCatalogPage,
})
