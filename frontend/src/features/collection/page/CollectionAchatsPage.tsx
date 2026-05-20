import { useQuery } from '@tanstack/react-query'

import { ListPageLayout } from '@/component/Layout'
import { userProductQueries } from '@/lib/queries/user-products'
import { CollectionSubNav } from '../components/CollectionSubNav'
import { HistoryTab } from '../components/tabs/HistoryTab/HistoryTab'

import './CollectionPage.css'

export const CollectionAchatsPage = () => {
  const { data: userProducts } = useQuery(userProductQueries.list())

  return (
    <ListPageLayout>
      <ListPageLayout.Header
        title="Achats"
        meta="Historique des achats de votre collection"
        actions={<CollectionSubNav current="achats" />}
        transparent
        centered
      />

      <ListPageLayout.Body maxWidth="1200px" className="coll-page-container">
        <HistoryTab userProducts={userProducts ?? []} />
      </ListPageLayout.Body>
    </ListPageLayout>
  )
}
