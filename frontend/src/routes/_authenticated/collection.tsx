import { createFileRoute } from '@tanstack/react-router'

import { CollectionPage } from '../../component/pages/Collection/Collection'

export const Route = createFileRoute('/_authenticated/collection')({
  component: RouteComponent,
})

function RouteComponent() {
  return <CollectionPage />
}
