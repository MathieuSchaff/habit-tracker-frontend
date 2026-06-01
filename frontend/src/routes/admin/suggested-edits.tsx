import { createFileRoute } from '@tanstack/react-router'

import { AdminSuggestedEditsPage } from '@/features/admin/components/AdminSuggestedEditsPage'
import { adminQueries } from '@/lib/queries/admin'

export const Route = createFileRoute('/admin/suggested-edits')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminQueries.suggestedEdits('pending')),
  component: AdminSuggestedEditsPage,
})
