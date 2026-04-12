import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'

import { BackButton } from '@/component/Button/BackButton'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions } from '@/component/Layout/PageLayout/PageTopActions'
import { productQueries } from '../../../lib/queries/products'
import { ProductForm } from './ProductForm/ProductForm'

const route = getRouteApi('/products/$slug/edit')

export function ProductEditPage() {
  const { slug } = route.useParams()
  const { data: product } = useSuspenseQuery(productQueries.bySlug(slug))
  const { data: currentTags } = useSuspenseQuery(productQueries.tags(product.id))
  const navigate = useNavigate()

  return (
    <DetailPageLayout banner>
      <PageTopActions>
        <BackButton to="/products/$slug" params={{ slug }}>
          Retour
        </BackButton>
      </PageTopActions>

      <ProductForm
        mode="edit"
        product={product}
        initialTags={currentTags.map((t) => ({
          tagId: t.productTagId,
          tagName: t.tagName,
          relevance: (t.relevance || 'secondary') as 'primary' | 'secondary' | 'avoid',
        }))}
        onSuccess={(newSlug) => navigate({ to: '/products/$slug', params: { slug: newSlug } })}
      />
    </DetailPageLayout>
  )
}
