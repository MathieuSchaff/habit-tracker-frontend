import { useQuery } from '@tanstack/react-query'

import { ListPageLayout } from '@/component/Layout'
import { userProductQueries } from '@/lib/queries/user-products'
import { CollectionSubNav } from '../components/CollectionSubNav'
import { AnalysisTab } from '../components/tabs/AnalysisTab/AnalysisTab'

import './CollectionPage.css'

export const CollectionMotifsPage = () => {
  const { data: userProducts } = useQuery(userProductQueries.list())

  return (
    <ListPageLayout>
      <ListPageLayout.Header
        title="Motifs"
        meta="Vue d'ensemble de votre étagère"
        actions={<CollectionSubNav current="motifs" />}
        transparent
        centered
      />

      <ListPageLayout.Body maxWidth="1200px" className="coll-page-container">
        {userProducts && <AnalysisTab userProducts={userProducts} />}
      </ListPageLayout.Body>
    </ListPageLayout>
  )
}
