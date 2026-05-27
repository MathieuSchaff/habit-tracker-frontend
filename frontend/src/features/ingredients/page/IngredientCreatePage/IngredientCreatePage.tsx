import { useNavigate } from '@tanstack/react-router'

import { BackButton } from '@/component/Button/BackButton'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions } from '@/component/Layout/PageLayout/PageTopActions'
import { PageTitle } from '@/component/Typography/PageTitle/PageTitle'
import { IngredientForm } from '../../components/IngredientForm/IngredientForm'

export function IngredientCreatePage() {
  const navigate = useNavigate()

  return (
    <DetailPageLayout banner>
      <PageTopActions>
        <BackButton to="/ingredients">Ingrédients</BackButton>
      </PageTopActions>

      <PageTitle title="Nouvel ingrédient" />

      <IngredientForm
        mode="create"
        onSuccess={(slug) => navigate({ to: '/ingredients/$slug', params: { slug } })}
      />
    </DetailPageLayout>
  )
}
