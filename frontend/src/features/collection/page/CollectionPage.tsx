import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { BarChart3, History, Package, Plus } from 'lucide-react'
import { useState } from 'react'

import { userProductQueries } from '../../../lib/queries/user-products'
import { PurchaseHistoryTab } from '../components/AchatsComponent/PurchaseHistoryTab'
import { AnalysisTab } from '../components/AnalysisComponent/AnalysisTab'
import { CollectionTab } from '../components/CollectionComponent/CollectionTab'
import { QuickAddModal } from '../components/QuickAddModal/QuickAddModal'

import './Collection.css'

type Tab = 'collection' | 'history' | 'insights'

export const CollectionPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('collection')
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: userProducts, isPending } = useQuery(userProductQueries.list())

  return (
    <div className="coll-page-wrapper">
      {/* titre + bouton ajout */}
      <div className="coll-topbar">
        <span className="coll-topbar-title">Ma Collection</span>
        <button
          type="button"
          className="coll-topbar-add"
          onClick={() => setShowAddModal(true)}
          aria-label="Ajouter un produit"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Navigation entre les 3 onglets */}
      <div className="coll-icon-tabs">
        <button
          type="button"
          className={clsx('coll-icon-tab', activeTab === 'collection' && 'coll-icon-tab-active')}
          onClick={() => setActiveTab('collection')}
        >
          <Package size={18} />
          <span>Collection</span>
          {userProducts && <span className="coll-tab-badge">{userProducts.length}</span>}
        </button>
        <button
          type="button"
          className={clsx('coll-icon-tab', activeTab === 'insights' && 'coll-icon-tab-active')}
          onClick={() => setActiveTab('insights')}
        >
          <BarChart3 size={18} />
          <span>Analyses</span>
        </button>
        <button
          type="button"
          className={clsx('coll-icon-tab', activeTab === 'history' && 'coll-icon-tab-active')}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          <span>Achats</span>
        </button>
      </div>
      {isPending ? (
        <div>pending</div>
      ) : (
        <div className="coll-page-container">
          {activeTab === 'collection' && <CollectionTab userProducts={userProducts} />}

          {activeTab === 'insights' && userProducts && <AnalysisTab userProducts={userProducts} />}

          {activeTab === 'history' && <PurchaseHistoryTab userProducts={userProducts ?? []} />}
        </div>
      )}
      {showAddModal && <QuickAddModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
