import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Leaf, MessageSquare, Pencil } from 'lucide-react'

import { BackButton } from '@/component/Button/BackButton'
import { Button } from '@/component/Button/Button'
import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { CatalogQualityBadge } from '@/component/DataDisplay/CatalogQualityBadge/CatalogQualityBadge'
import { DetailHero } from '@/component/Layout/DetailHero/DetailHero'
import { IconBox } from '@/component/Layout/IconBox/IconBox'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions, PageTopActionsRight } from '@/component/Layout/PageLayout/PageTopActions'
import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
import { ingredientQueries } from '@/lib/queries/ingredients'
import '@/features/ingredients/components/IngredientInfoTab/IngredientInfoTab.css'

const route = getRouteApi('/ingredients/$slug')

type IngredientTab = 'infos' | 'discussions'

export function IngredientLayout() {
  const { slug } = route.useParams()
  const { data: ingredient } = useSuspenseQuery(ingredientQueries.bySlug(slug))
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })

  const isDiscussions = location.pathname.includes('/discussions')
  const activeTab: IngredientTab = isDiscussions ? 'discussions' : 'infos'

  const tabOptions: TabOption<IngredientTab>[] = [
    { id: 'infos', label: 'Infos' },
    { id: 'discussions', label: 'Discussions', icon: <MessageSquare size={14} /> },
  ]

  function handleTabChange(id: IngredientTab) {
    if (id === 'infos') {
      navigate({ to: '/ingredients/$slug', params: { slug } })
    } else {
      navigate({ to: '/ingredients/$slug/discussions', params: { slug } })
    }
  }

  return (
    <DetailPageLayout banner>
      <PageTopActions>
        <BackButton to="/ingredients">Ingrédients</BackButton>
        <PageTopActionsRight>
          <Button
            to="/ingredients/$slug/edit"
            params={{ slug }}
            variant="secondary"
            className="action-edit"
            aria-label="Modifier cet ingrédient"
          >
            <Pencil size={14} />
            <span className="action-edit__label">Modifier</span>
          </Button>
        </PageTopActionsRight>
      </PageTopActions>

      <DetailHero
        className="ingredient-hero"
        media={
          <IconBox className="ingredient-hero__icon">
            <Leaf size={28} />
          </IconBox>
        }
        eyebrow={ingredient.category ? <span>{ingredient.category}</span> : undefined}
        title={ingredient.name}
        titleViewTransition={`ingredient-name-${slug}`}
        chips={
          ingredient.category || ingredient.catalogQuality === 'verified' ? (
            <>
              {ingredient.category && <Badge variant="default">{ingredient.category}</Badge>}
              <CatalogQualityBadge quality={ingredient.catalogQuality} />
            </>
          ) : undefined
        }
      />

      <Tabs
        options={tabOptions}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="underline"
        ariaLabel="Sections de l'ingrédient"
      />

      <div style={{ viewTransitionName: 'tab-content' }}>
        <Outlet />
      </div>
    </DetailPageLayout>
  )
}
