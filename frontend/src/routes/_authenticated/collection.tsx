import { createFileRoute, Outlet } from '@tanstack/react-router'

import { userProductQueries } from '../../lib/queries/user-products'

export const Route = createFileRoute('/_authenticated/collection')({
  // Shared loader: the three tabs (index/motifs/achats) read the same list cache hot.
  loader: ({ context }) => context.queryClient.ensureQueryData(userProductQueries.list()),
  component: () => <Outlet />,
})
