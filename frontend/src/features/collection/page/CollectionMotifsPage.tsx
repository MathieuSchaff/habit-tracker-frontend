import { ListPageLayout } from '@/component/Layout'
import { CollectionSubNav } from '../components/CollectionSubNav'
import { FormulaMotifs } from '../components/tabs/FormulaMotifs/FormulaMotifs'

import './CollectionPage.css'

export const CollectionMotifsPage = () => {
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
        <FormulaMotifs />
      </ListPageLayout.Body>
    </ListPageLayout>
  )
}
