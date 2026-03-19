import { createFileRoute } from '@tanstack/react-router'

import { CollectionPage } from '../../features/collection/components/CollectionPage/Collection'

export const Route = createFileRoute('/_authenticated/collection')({
  component: RouteComponent,
})

function RouteComponent() {
  return <CollectionPage />
}
