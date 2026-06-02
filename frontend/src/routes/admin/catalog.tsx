import { createFileRoute } from '@tanstack/react-router'

import { Spinner } from '@/component/Feedback/ui/Spinner/Spinner'
import { AdminCatalogPage } from '@/features/admin/components/AdminCatalogPage'
import { adminQueries } from '@/lib/queries/admin'

export const Route = createFileRoute('/admin/catalog')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      adminQueries.catalogQueue('product', 'unverified', 'visible')
    ),
  pendingComponent: () => <Spinner />,
  errorComponent: () => <p>Impossible de charger le catalogue.</p>,
  component: AdminCatalogPage,
})
