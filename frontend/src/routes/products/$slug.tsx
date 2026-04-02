import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { MessageSquare, Package, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'

import { Badge, type BadgeVariant } from '@/component/DataDisplay/Badge/Badge'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions, PageTopActionsRight } from '@/component/Layout/PageLayout/PageTopActions'
import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
import { AddToCollectionModal } from '@/features/products/components/AddToCollectionModal'
import { productQueries } from '@/lib/queries/products'
import '@/features/products/styles/kinds.css'
import '@/features/products/components/ProductPage.css'

import { BackButton } from '@/component/Button/BackButton'
import { Button } from '@/component/Button/Button'

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

function ProductLayout() {
  const { slug } = Route.useParams()
  const { data: product } = useSuspenseQuery(productQueries.bySlug(slug))
  const [showAddModal, setShowAddModal] = useState(false)
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })

  const isDiscussions = location.pathname.includes('/discussions')
  const activeTab: ProductTab = isDiscussions ? 'discussions' : 'infos'

  const priceFormatted =
    product.priceCents != null
      ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
          product.priceCents / 100
        )
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
        <BackButton onClick={() => window.history.back()}>Produits</BackButton>
        <PageTopActionsRight>
          <Button to="/products/$slug/edit" params={{ slug }} variant="primary">
            <Pencil size={14} />
            Modifier
          </Button>
          <Button onClick={() => setShowAddModal(true)} variant="accent">
            <Plus size={16} />
            Ajouter à la collection
          </Button>
        </PageTopActionsRight>
      </PageTopActions>

      <div className="product-hero">
        <div className={`product-hero__icon kind-icon kind--${getBadgeVariant(product.kind)}`}>
          <Package size={28} />
        </div>
        <div className="product-hero__info">
          <h1 className="product-hero__name">{product.name}</h1>
          <Link to="/products" search={{ brand: [product.brand] }} className="product-hero__brand">
            {product.brand}
          </Link>
          <div className="product-hero__tags">
            <Badge variant={getBadgeVariant(product.kind)} className="product-hero__kind">
              {product.kind}
            </Badge>
            {product.unit && <span className="product-hero__tag">{product.unit}</span>}
          </div>
        </div>
        {priceFormatted && <span className="product-price">{priceFormatted}</span>}
      </div>

      <Tabs options={tabOptions} activeTab={activeTab} onTabChange={handleTabChange} />

      <Outlet />

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

export const Route = createFileRoute('/products/$slug')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueries.bySlug(params.slug)),
  errorComponent: () => <div>Produit introuvable</div>,
  pendingComponent: () => <div>Chargement...</div>,
  component: ProductLayout,
})
