import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { BarChart3, History, Package, Plus } from 'lucide-react'
import { useState } from 'react'

import { userProductQueries } from '@/lib/queries/user-products'
import { QuickAdd } from '../components/modals/QuickAdd/QuickAdd'
import { AnalysisTab } from '../components/tabs/AnalysisTab/AnalysisTab'
import { CollectionTab } from '../components/tabs/CollectionTab/CollectionTab'
import { HistoryTab } from '../components/tabs/HistoryTab/HistoryTab'

import './CollectionPage.css'

type Tab = 'collection' | 'history' | 'insights'

export const CollectionPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('collection')
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: userProducts } = useQuery(userProductQueries.list())

  const tabs: Tab[] = ['collection', 'insights', 'history']
  const activeIndex = tabs.indexOf(activeTab)

  return (
    <div className="coll-page-wrapper">
      {/* Title + add button */}
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

      {/* Nav between the 3 tabs */}
      <div className="coll-tabs-wrapper">
        <div
          className="coll-icon-tabs"
          style={{ '--active-index': activeIndex } as React.CSSProperties}
        >
          {/* The sliding background */}
          <div className="coll-tabs-indicator" />

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
      </div>
      <div className="coll-page-container">
        {activeTab === 'collection' && <CollectionTab userProducts={userProducts} />}

        {activeTab === 'insights' && userProducts && <AnalysisTab userProducts={userProducts} />}

        {activeTab === 'history' && <HistoryTab userProducts={userProducts ?? []} />}
      </div>
      {showAddModal && <QuickAdd onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
