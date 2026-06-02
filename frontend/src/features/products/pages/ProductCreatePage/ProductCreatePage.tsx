import { getRouteApi, useNavigate } from '@tanstack/react-router'

import { BackButton } from '@/component/Button/BackButton'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions } from '@/component/Layout/PageLayout/PageTopActions'
import { PageTitle } from '@/component/Typography/PageTitle/PageTitle'
import { ProductForm } from '@/features/products/components/ProductForm/ProductForm'

const routeApi = getRouteApi('/_authenticated/products/new')

export function ProductCreatePage() {
  const navigate = useNavigate()
  const { name, brand } = routeApi.useSearch()

  return (
    <DetailPageLayout banner>
      <PageTopActions>
        <BackButton to="/products">Produits</BackButton>
      </PageTopActions>

      <PageTitle title="Nouveau produit" />

      <ProductForm
        mode="create"
        prefill={{ name, brand }}
        onSuccess={(slug) => navigate({ to: '/products/$slug', params: { slug } })}
      />
    </DetailPageLayout>
  )
}
