import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { ListPageLayout } from '@/component/Layout'
import { userProductQueries } from '@/lib/queries/user-products'
import { CollectionSubNav } from '../components/CollectionSubNav'
import { QuickAdd } from '../components/modals/QuickAdd/QuickAdd'
import { CollectionTab } from '../components/tabs/CollectionTab/CollectionTab'

import './CollectionPage.css'

export const CollectionPage = () => {
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: userProducts } = useQuery(userProductQueries.list())

  const totalProducts = userProducts?.length ?? 0
  const headerMeta =
    totalProducts > 0 ? `${totalProducts} ${totalProducts > 1 ? 'produits' : 'produit'}` : null

  return (
    <ListPageLayout>
      <ListPageLayout.Header
        title="Ma Collection"
        meta={headerMeta}
        actions={
          <div className="coll-header-actions">
            <CollectionSubNav current="shelf" />
            <Button
              type="button"
              variant="primary"
              size="md"
              className="coll-add-btn"
              onClick={() => setShowAddModal(true)}
              aria-label="Ajouter un produit"
            >
              <Plus size={16} aria-hidden="true" />
              <span>Ajouter</span>
            </Button>
          </div>
        }
        transparent
        centered
      />

      <ListPageLayout.Body maxWidth="1200px" className="coll-page-container">
        <CollectionTab userProducts={userProducts} onAddClick={() => setShowAddModal(true)} />
      </ListPageLayout.Body>
      {showAddModal && <QuickAdd onClose={() => setShowAddModal(false)} />}
    </ListPageLayout>
  )
}
