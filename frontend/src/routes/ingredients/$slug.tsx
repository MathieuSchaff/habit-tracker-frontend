import { createFileRoute, Outlet } from '@tanstack/react-router'

import { ingredientQueries } from '../../lib/queries/ingredients'

export const Route = createFileRoute('/ingredients/$slug')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(ingredientQueries.bySlug(params.slug)),
  component: () => <Outlet />,
})
