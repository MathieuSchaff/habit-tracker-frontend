import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'

import { BackButton } from '@/component/Button/BackButton'
import { Button } from '@/component/Button/Button'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions } from '@/component/Layout/PageLayout/PageTopActions'
import { ingredientQueries, useDeleteIngredient } from '@/lib/queries/ingredients'
import { useAuthStore } from '@/store/auth'
import { IngredientForm } from '../../components/IngredientForm/IngredientForm'

const route = getRouteApi('/ingredients/$slug_/edit')

export function IngredientEditPage() {
  const { slug } = route.useParams()
  const { data: ingredient } = useSuspenseQuery(ingredientQueries.bySlug(slug))
  const { data: currentTags } = useSuspenseQuery(ingredientQueries.tags(ingredient.id))
  const navigate = useNavigate()
  const isAdmin = useAuthStore((s) => s.role === 'admin')
  const deleteIngredient = useDeleteIngredient()

  function handleDelete() {
    if (!confirm(`Supprimer « ${ingredient.name} » ? Cette action est irréversible.`)) return
    deleteIngredient.mutate(ingredient.id, {
      onSuccess: () => navigate({ to: '/ingredients' }),
    })
  }

  return (
    <DetailPageLayout banner>
      <PageTopActions>
        <BackButton to="/ingredients/$slug" params={{ slug }}>
          Retour
        </BackButton>
        {isAdmin && (
          <Button
            variant="danger-ghost"
            onClick={handleDelete}
            loading={deleteIngredient.isPending}
          >
            <Trash2 size={16} />
            Supprimer
          </Button>
        )}
      </PageTopActions>

      <IngredientForm
        mode="edit"
        ingredient={ingredient}
        initialTags={currentTags.map((t) => ({
          tagId: t.ingredientTagId,
          tagName: t.tagName,
          relevance: (t.relevance || 'secondary') as 'primary' | 'secondary' | 'avoid',
        }))}
        onSuccess={(slug) => navigate({ to: '/ingredients/$slug', params: { slug } })}
      />
    </DetailPageLayout>
  )
}
