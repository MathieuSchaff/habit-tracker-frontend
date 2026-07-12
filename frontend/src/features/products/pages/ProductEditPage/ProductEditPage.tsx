import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useCallback } from 'react'

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
  const currentTags = product.tags
  const navigate = useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const isAdmin = useAuthStore((s) => s.role === 'admin')
  const deleteProduct = useDeleteProduct()

  // Pop the edit entry instead of pushing the detail route, so the history stack doesn't grow
  // into a product↔edit ping-pong. Fall back to the detail route on deep-link (no in-app history).
  const handleBack = useCallback(() => {
    if (canGoBack) {
      router.history.back()
    } else {
      navigate({ to: '/products/$slug', params: { slug } })
    }
  }, [canGoBack, router, navigate, slug])

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
        <BackButton onClick={handleBack}>Retour</BackButton>
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
