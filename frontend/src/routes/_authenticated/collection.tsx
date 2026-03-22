import { createFileRoute } from '@tanstack/react-router'

import { CollectionPage } from '../../features/collection/page/CollectionPage'

export const Route = createFileRoute('/_authenticated/collection')({
  component: RouteComponent,
})

function RouteComponent() {
  return <CollectionPage />
}
