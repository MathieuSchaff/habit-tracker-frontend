import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'

import { BackButton } from '@/component/Button/BackButton'
import { Button } from '@/component/Button/Button'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions } from '@/component/Layout/PageLayout/PageTopActions'
import { ProductForm } from '@/features/products/components/ProductForm/ProductForm'
import { productQueries, useDeleteProduct } from '@/lib/queries/products'
import { useAuthStore } from '@/store/auth'

const route = getRouteApi('/products/$slug_/edit')

export function ProductEditPage() {
  const { slug } = route.useParams()
  const { data: product } = useSuspenseQuery(productQueries.bySlug(slug))
  const { data: currentTags } = useSuspenseQuery(productQueries.tags(product.id))
  const navigate = useNavigate()
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const deleteProduct = useDeleteProduct()

  function handleDelete() {
    if (!confirm(`Supprimer « ${product.name} » ? Cette action est irréversible.`)) return
    deleteProduct.mutate(
      { id: product.id, slug },
      { onSuccess: () => navigate({ to: '/products' }) }
    )
  }

  return (
    <DetailPageLayout banner>
      <PageTopActions>
        <BackButton to="/products/$slug" params={{ slug }}>
          Retour
        </BackButton>
        {isAdmin && (
          <Button variant="danger-ghost" onClick={handleDelete} loading={deleteProduct.isPending}>
            <Trash2 size={16} />
            Supprimer
          </Button>
        )}
      </PageTopActions>

      <ProductForm
        key={product.id}
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
