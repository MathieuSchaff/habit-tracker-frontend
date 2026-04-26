import { useNavigate } from '@tanstack/react-router'

import { BackButton } from '@/component/Button/BackButton'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions } from '@/component/Layout/PageLayout/PageTopActions'
import { PageTitle } from '@/component/Typography/PageTitle/PageTitle'
import { ProductForm } from './ProductForm/ProductForm'

export function ProductCreatePage() {
  const navigate = useNavigate()

  return (
    <DetailPageLayout banner>
      <PageTopActions>
        <BackButton to="/products">Produits</BackButton>
      </PageTopActions>

      <PageTitle title="Nouveau produit" />

      <ProductForm
        mode="create"
        onSuccess={(slug) => navigate({ to: '/products/$slug', params: { slug } })}
      />
    </DetailPageLayout>
  )
}
