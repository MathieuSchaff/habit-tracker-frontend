import { getProductKindLabel } from '@habit-tracker/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { MessageSquare, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'

import { Badge, type BadgeVariant } from '@/component/DataDisplay/Badge/Badge'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions, PageTopActionsRight } from '@/component/Layout/PageLayout/PageTopActions'
import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
import { AddToCollectionModal } from '@/features/products/components/AddToCollectionModal/AddToCollectionModal'
import { productQueries } from '@/lib/queries/products'
import '@/features/products/styles/kinds.css'
import '@/features/products/pages/ProductInfoTab/ProductInfoTab.css'

import { BackButton } from '@/component/Button/BackButton'
import { Button } from '@/component/Button/Button'
import { ProductImage } from '@/features/products/components/ProductImage/ProductImage'

const route = getRouteApi('/products/$slug')
const eurFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

function getBadgeVariant(kind: string): BadgeVariant {
  switch (kind) {
    case 'complement':
      return 'complement'
    case 'skincare':
      return 'skincare'
    case 'huile':
      return 'huile'
    case 'vitamine':
      return 'vitamine'
    default:
      return 'default'
  }
}

type ProductTab = 'infos' | 'discussions'

export function ProductLayout() {
  const { slug } = route.useParams()
  const { data: product } = useSuspenseQuery(productQueries.bySlug(slug))
  const [showAddModal, setShowAddModal] = useState(false)
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })

  const isDiscussions = location.pathname.includes('/discussions')
  const activeTab: ProductTab = isDiscussions ? 'discussions' : 'infos'

  const priceFormatted =
    product.priceCents != null && product.priceCents > 0
      ? eurFormatter.format(product.priceCents / 100)
      : null

  const tabOptions: TabOption<ProductTab>[] = [
    { id: 'infos', label: 'Infos' },
    { id: 'discussions', label: 'Discussions', icon: <MessageSquare size={14} /> },
  ]

  function handleTabChange(id: ProductTab) {
    if (id === 'infos') {
      navigate({ to: '/products/$slug', params: { slug } })
    } else {
      navigate({ to: '/products/$slug/discussions', params: { slug } })
    }
  }

  return (
    <DetailPageLayout banner={true}>
      <PageTopActions>
        <BackButton to="/products">Produits</BackButton>
        <PageTopActionsRight>
          <Button
            to="/products/$slug/edit"
            params={{ slug }}
            variant="secondary"
            className="action-edit"
            aria-label="Modifier ce produit"
          >
            <Pencil size={14} />
            <span className="action-edit__label">Modifier</span>
          </Button>
          <Button onClick={() => setShowAddModal(true)} variant="accent">
            <Plus size={16} />
            Ajouter à la collection
          </Button>
        </PageTopActionsRight>
      </PageTopActions>

      <div className="product-hero">
        <ProductImage
          kind={product.kind}
          unit={product.unit}
          imageUrl={product.imageUrl}
          size={160}
          className="product-hero__image"
        />
        <div className="product-hero__info">
          <h1 className="product-hero__name" style={{ viewTransitionName: `product-name-${slug}` }}>
            {product.name}
          </h1>
          <Link
            to="/products"
            search={{ brand: [product.brand] }}
            className="product-hero__brand"
            aria-label={`Voir tous les produits ${product.brand}`}
          >
            {product.brand}
          </Link>
          <div className="product-hero__tags">
            <Badge variant={getBadgeVariant(product.kind)} className="product-hero__kind">
              {getProductKindLabel(product.kind)}
            </Badge>
            {product.totalAmount != null && product.totalAmount > 0 && (
              <span className="product-hero__amount">
                {product.totalAmount} {product.amountUnit ?? product.unit}
              </span>
            )}
          </div>
        </div>
        {priceFormatted && <span className="product-price">{priceFormatted}</span>}
      </div>

      <Tabs
        options={tabOptions}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="underline"
        ariaLabel="Sections du produit"
      />

      <div style={{ viewTransitionName: 'tab-content' }}>
        <Outlet />
      </div>

      {showAddModal && (
        <AddToCollectionModal
          product={{
            id: product.id,
            name: product.name,
            brand: product.brand,
            priceCents: product.priceCents,
          }}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => setShowAddModal(false)}
        />
      )}
    </DetailPageLayout>
  )
}
