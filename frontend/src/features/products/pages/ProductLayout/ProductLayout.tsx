import { getProductKindLabel } from '@aurore/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import {
  getRouteApi,
  Link,
  Outlet,
  useCanGoBack,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { MessageSquare, Pencil } from 'lucide-react'
import { useCallback } from 'react'

import { Badge, type BadgeVariant } from '@/component/DataDisplay/Badge/Badge'
import { CatalogQualityBadge } from '@/component/DataDisplay/CatalogQualityBadge/CatalogQualityBadge'
import { DetailHero } from '@/component/Layout/DetailHero/DetailHero'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions, PageTopActionsRight } from '@/component/Layout/PageLayout/PageTopActions'
import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
import { ProductCollectionAction } from '@/features/products/components/ProductCollectionAction/ProductCollectionAction'
import { productQueries } from '@/lib/queries/products'
import { useAuthStore } from '@/store/auth'
import '@/features/products/styles/kinds.css'
import '@/features/products/pages/ProductInfoTab/ProductInfoTab.css'
import './ProductLayout.css'

import { BackButton } from '@/component/Button/BackButton'
import { ButtonLink } from '@/component/Button/Button'
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

const TAB_OPTIONS: TabOption<ProductTab>[] = [
  { id: 'infos', label: 'Infos' },
  { id: 'discussions', label: 'Discussions', icon: <MessageSquare size={14} /> },
]

export function ProductLayout() {
  const { slug } = route.useParams()
  const { data: product } = useSuspenseQuery(productQueries.bySlug(slug))
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  // Subscribe to a boolean, not the whole location, to skip re-renders on search-param churn.
  const isDiscussions = useRouterState({
    select: (s) => s.location.pathname.includes('/discussions'),
  })
  const activeTab: ProductTab = isDiscussions ? 'discussions' : 'infos'

  const priceFormatted =
    product.priceCents != null && product.priceCents > 0
      ? eurFormatter.format(product.priceCents / 100)
      : null

  const handleTabChange = useCallback(
    (id: ProductTab) => {
      // replace: tabs are same-page sections, not history steps. Pushing them would strand
      // the back button on the previous tab instead of returning to the list.
      if (id === 'infos') {
        navigate({ to: '/products/$slug', params: { slug }, replace: true })
      } else {
        navigate({ to: '/products/$slug/discussions', params: { slug }, replace: true })
      }
    },
    [navigate, slug]
  )

  // Go back in history so the list's search params (filters) survive; fall back to a bare
  // /products when the detail page was reached directly (deep link, no in-app history).
  const handleBack = useCallback(() => {
    if (canGoBack) {
      router.history.back()
    } else {
      navigate({ to: '/products' })
    }
  }, [canGoBack, router, navigate])

  return (
    <DetailPageLayout banner={true}>
      <PageTopActions>
        <BackButton onClick={handleBack} prominence="strong">
          Retour aux produits
        </BackButton>
        <PageTopActionsRight>
          {/* Edit route is auth-gated; hide the affordance for anon instead of a login redirect. */}
          {user && (
            <ButtonLink
              to="/products/$slug/edit"
              params={{ slug }}
              variant="secondary"
              className="action-edit"
              aria-label="Modifier ce produit"
            >
              <Pencil size={14} />
              <span className="action-edit__label">Modifier</span>
            </ButtonLink>
          )}
          <ProductCollectionAction
            product={{
              id: product.id,
              name: product.name,
              brand: product.brand,
              priceCents: product.priceCents,
            }}
          />
        </PageTopActionsRight>
      </PageTopActions>

      <DetailHero
        className="product-hero"
        media={
          <ProductImage
            kind={product.kind}
            unit={product.unit}
            imageUrl={product.imageUrl}
            size={168}
            className="product-hero__image"
          />
        }
        eyebrow={
          <>
            <Link
              to="/products"
              search={{ brand: [product.brand] }}
              aria-label={`Voir tous les produits ${product.brand}`}
            >
              {product.brand}
            </Link>
            <span className="detail-hero__dot" aria-hidden="true" />
            <span>{getProductKindLabel(product.kind)}</span>
          </>
        }
        title={product.name}
        titleViewTransition={`product-name-${slug}`}
        chips={
          <>
            <Badge variant={getBadgeVariant(product.kind)} className="product-hero__kind">
              {getProductKindLabel(product.kind)}
            </Badge>
            <CatalogQualityBadge quality={product.catalogQuality} />
            {product.totalAmount != null && product.totalAmount > 0 && (
              <span className="product-hero__amount">
                {product.totalAmount} {product.amountUnit ?? product.unit}
              </span>
            )}
          </>
        }
        aside={priceFormatted ? <span className="product-price">{priceFormatted}</span> : undefined}
      />

      <Tabs
        options={TAB_OPTIONS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="underline"
        ariaLabel="Sections du produit"
      />

      <div style={{ viewTransitionName: 'tab-content' }}>
        <Outlet />
      </div>
    </DetailPageLayout>
  )
}
