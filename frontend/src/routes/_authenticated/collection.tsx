import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { ListPageLayout } from '@/component/Layout/PageLayout/ListPageLayout'
import { CollectionSubNav } from '@/features/collection/components/CollectionSubNav'
import { QuickAdd } from '@/features/collection/components/modals/QuickAdd/QuickAdd'
import { CollectionAddProvider } from '@/features/collection/context/CollectionAddContext'
import { userProductQueries } from '../../lib/queries/user-products'

import '@/features/collection/page/CollectionPage.css'

export const Route = createFileRoute('/_authenticated/collection')({
  // Shared loader: the three tabs (index/motifs/achats) read the same list cache hot.
  loader: ({ context }) => context.queryClient.ensureQueryData(userProductQueries.list()),
  component: CollectionLayout,
})

// Header lives here, mounted once: navigating between tabs swaps only the <Outlet /> body,
// so the subnav and "Add" action stay put instead of remounting (no layout shift / animation replay).
function CollectionLayout() {
  const [showAddModal, setShowAddModal] = useState(false)
  const openAdd = () => setShowAddModal(true)

  return (
    <ListPageLayout>
      <ListPageLayout.Header
        title="Ma Collection"
        actions={
          <div className="coll-header-actions">
            <CollectionSubNav />
            <Button
              type="button"
              variant="primary"
              size="md"
              className="coll-add-btn"
              onClick={openAdd}
              aria-label="Ajouter un produit"
            >
              <Plus size={16} aria-hidden="true" />
              <span>Ajouter</span>
            </Button>
          </div>
        }
        transparent
        centered
        maxWidth="1200px"
      />

      <ListPageLayout.Body maxWidth="1200px" className="coll-page-container">
        <CollectionAddProvider value={openAdd}>
          <Outlet />
        </CollectionAddProvider>
      </ListPageLayout.Body>
      {showAddModal && <QuickAdd onClose={() => setShowAddModal(false)} />}
    </ListPageLayout>
  )
}
