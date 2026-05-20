import { createFileRoute } from '@tanstack/react-router'

import { CollectionMotifsPage } from '../../features/collection/page/CollectionMotifsPage'

export const Route = createFileRoute('/_authenticated/collection/motifs')({
  component: CollectionMotifsPage,
})
