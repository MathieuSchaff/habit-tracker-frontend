import { useQuery } from '@tanstack/react-query'
import { BarChart3, History, Package } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@/component/Layout/PageHeader/PageHeader'
import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
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

  const totalProducts = userProducts?.length ?? 0

  const tabOptions: TabOption<Tab>[] = [
    {
      id: 'collection',
      label: 'Collection',
      icon: <Package size={18} />,
      badge: totalProducts,
    },
    {
      id: 'insights',
      label: 'Analyses',
      icon: <BarChart3 size={18} />,
    },
    {
      id: 'history',
      label: 'Achats',
      icon: <History size={18} />,
    },
  ]

  const headerMeta =
    totalProducts > 0 ? `${totalProducts} ${totalProducts > 1 ? 'produits' : 'produit'}` : null

  return (
    <div className="coll-page-wrapper">
      <PageHeader title="Ma Collection" meta={headerMeta} />

      <div className="coll-tabs-wrapper">
        <Tabs options={tabOptions} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="coll-page-container">
        {activeTab === 'collection' && (
          <CollectionTab userProducts={userProducts} onAddClick={() => setShowAddModal(true)} />
        )}

        {activeTab === 'insights' && userProducts && <AnalysisTab userProducts={userProducts} />}

        {activeTab === 'history' && <HistoryTab userProducts={userProducts ?? []} />}
      </div>
      {showAddModal && <QuickAdd onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
