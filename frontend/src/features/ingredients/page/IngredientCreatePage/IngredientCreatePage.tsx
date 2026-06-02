import { getRouteApi, useNavigate } from '@tanstack/react-router'

import { BackButton } from '@/component/Button/BackButton'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions } from '@/component/Layout/PageLayout/PageTopActions'
import { PageTitle } from '@/component/Typography/PageTitle/PageTitle'
import { IngredientForm } from '../../components/IngredientForm/IngredientForm'

const routeApi = getRouteApi('/_authenticated/ingredients/new')

export function IngredientCreatePage() {
  const navigate = useNavigate()
  const { name } = routeApi.useSearch()

  return (
    <DetailPageLayout banner>
      <PageTopActions>
        <BackButton to="/ingredients">Ingrédients</BackButton>
      </PageTopActions>

      <PageTitle title="Nouvel ingrédient" />

      <IngredientForm
        mode="create"
        prefill={{ name }}
        onSuccess={(slug) => navigate({ to: '/ingredients/$slug', params: { slug } })}
      />
    </DetailPageLayout>
  )
}
