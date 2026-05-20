import { createFileRoute } from '@tanstack/react-router'

import { CollectionAchatsPage } from '../../features/collection/page/CollectionAchatsPage'

export const Route = createFileRoute('/_authenticated/collection/achats')({
  component: CollectionAchatsPage,
})
