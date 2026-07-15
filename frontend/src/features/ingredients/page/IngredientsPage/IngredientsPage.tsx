import type { IngredientType } from '@aurore/shared'

import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, FlaskConical, Plus, SlidersHorizontal } from 'lucide-react'
import type React from 'react'
import { startTransition, useCallback, useMemo, useState } from 'react'

import { Button, ButtonLink } from '@/component/Button/Button'
import { Card } from '@/component/Card/Card'
import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { ListPagination } from '@/component/DataDisplay/Pagination/ListPagination'
import { EmptyState } from '@/component/Feedback/ui/EmptyState/EmptyState'
import { RateLimitEmptyState } from '@/component/Feedback/ui/EmptyState/RateLimitEmptyState'
import { ActiveFiltersBar } from '@/component/Filter/ActiveFiltersBar/ActiveFiltersBar'
import { FilterDrawer } from '@/component/Filter/FilterDrawer/FilterDrawer'
import { emptyFilters, getFilterLabel } from '@/component/Filter/helpers'
import type { FilterValues } from '@/component/Filter/types'
import { Toggle } from '@/component/Input/Toggle/Toggle'
import { ListBrowseHeader } from '@/component/Layout/PageLayout/ListBrowseHeader'
import { ListPageLayout } from '@/component/Layout/PageLayout/ListPageLayout'
import { SearchCombobox } from '@/component/Search/SearchCombobox'
import { Tabs } from '@/component/Tabs/Tabs'
import { SKIN_CONCERN_LABELS, SKIN_TYPE_LABELS } from '@/constants/skin'
import {
  CATEGORY_ACCENTS,
  DEFAULT_CATEGORY_ACCENT,
  ingredientLabels,
} from '@/features/ingredients/constants'
import {
  buildDomainSwitchSearch,
  DOMAIN_TAB_OPTIONS,
  FILTER_KEYS,
  type FilterKey,
  GROUP_LABELS,
} from '@/features/ingredients/filters'
import { useIngredientTagFilterGroups } from '@/hooks/useIngredientTagFilterGroups'
import { useListFilters } from '@/hooks/useListFilters'
import { isRateLimitError } from '@/lib/helpers/apiError'
import { ingredientQueries, type ListIngredientsFilters } from '@/lib/queries/ingredients'
import { profileQueries } from '@/lib/queries/profile'
import { useAuthStore } from '@/store/auth'

import '@/component/Layout/PageLayout/ListPage.css'
import './IngredientsPage.css'

const routeApi = getRouteApi('/ingredients/')

const EMPTY_FILTERS = emptyFilters(FILTER_KEYS)
// 24 divides evenly by 2/3/4 columns (auto-fill grid) so non-final pages have no ragged last row
const PAGE_SIZE = 24

export function IngredientsPage() {
  const [isDrawerOpen, setDrawerOpen] = useState(false)

  const search = routeApi.useSearch()
  const { page, type, profile_filter } = search
  const navigate = useNavigate({ from: '/ingredients/' })

  const user = useAuthStore((s) => s.user)

  const { data: dermoProfile } = useQuery({
    ...profileQueries.dermo(),
    enabled: !!user && profile_filter,
  })

  const avoidFor = useMemo(
    () =>
      profile_filter && dermoProfile
        ? [...(dermoProfile.skinTypes ?? []), ...dermoProfile.skinConcerns]
        : [],
    [profile_filter, dermoProfile]
  )

  const filters: FilterValues<FilterKey> = Object.fromEntries(
    FILTER_KEYS.map((k) => [k, search[k] ?? []])
  ) as FilterValues<FilterKey>

  const { filterCount, activeTags, applyFilters, resetFilters, goToPage, toggleSingleFilter } =
    useListFilters({
      from: '/ingredients/',
      filters,
      emptyFilters: EMPTY_FILTERS,
      filterKeys: FILTER_KEYS,
    })

  const hasFilters = filterCount > 0

  const avoidForParam = avoidFor.length > 0 ? avoidFor : undefined

  const apiFilters: ListIngredientsFilters = {
    ...(hasFilters
      ? (Object.fromEntries(
          FILTER_KEYS.map((k) => [k, filters[k].length > 0 ? filters[k] : undefined])
        ) as Partial<ListIngredientsFilters>)
      : {}),
    type,
    page,
    limit: PAGE_SIZE,
    avoid_for: avoidForParam,
  }

  const { data, isLoading, isPlaceholderData, error } = useQuery({
    ...ingredientQueries.list(apiFilters),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  })

  const { data: filterOptions } = useQuery(ingredientQueries.filterOptions(type))

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const showRateLimit = isRateLimitError(error)

  const filterGroups = useIngredientTagFilterGroups(type, filterOptions?.tags)

  const handleDomainChange = useCallback(
    (next: IngredientType) => {
      startTransition(() => {
        navigate({
          search: (prev) => buildDomainSwitchSearch(prev, next, EMPTY_FILTERS),
          replace: true,
        })
      })
    },
    [navigate]
  )

  const handleProfileFilterChange = useCallback(
    (checked: boolean) => {
      navigate({ search: (prev) => ({ ...prev, profile_filter: checked, page: 1 }) })
    },
    [navigate]
  )

  const showProfileToggle = !!user && type === 'skincare'

  return (
    <ListPageLayout className="ingredients-page">
      <ListPageLayout.Header fullBleed>
        <ListBrowseHeader
          title="Ingrédients"
          meta={
            (!isLoading || total > 0) && (
              <>
                {total} ingrédient{total > 1 ? 's' : ''}
              </>
            )
          }
          metaBusy={isPlaceholderData}
          tools={
            <>
              <ButtonLink
                to="/ingredients/new"
                variant="ghost"
                size="md"
                className="list-browse-header__icon-btn"
                aria-label="Créer un ingrédient"
                title="Créer un ingrédient"
              >
                <Plus size={16} aria-hidden="true" />
              </ButtonLink>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setDrawerOpen(true)}
                className="list-filter-btn"
                aria-label={
                  filterCount > 0
                    ? `Filtrer (${filterCount} actif${filterCount > 1 ? 's' : ''})`
                    : 'Filtrer'
                }
              >
                <SlidersHorizontal size={14} aria-hidden="true" />
                <span>Filtrer</span>
                {filterCount > 0 && (
                  <span className="list-filter-btn__count" aria-hidden="true">
                    {filterCount}
                  </span>
                )}
              </Button>
            </>
          }
          tabs={
            <Tabs
              options={DOMAIN_TAB_OPTIONS}
              activeTab={type}
              onTabChange={handleDomainChange}
              variant="underline"
              scrollable
              ariaLabel="Domaine d'ingrédient"
              hasPanels={false}
            />
          }
          search={
            <SearchCombobox
              label="Rechercher un ingrédient"
              queryFn={ingredientQueries.searchInfinite}
              toResult={(item) => ({
                id: item.id,
                slug: item.slug,
                label: item.name,
                sublabel: item.category ?? undefined,
              })}
              onSelect={(slug) => navigate({ to: '/ingredients/$slug', params: { slug } })}
            />
          }
        />
      </ListPageLayout.Header>

      <ActiveFiltersBar
        activeTags={activeTags}
        groupLabels={GROUP_LABELS}
        getFilterLabel={(key, value) => getFilterLabel(filterGroups, key, value)}
        onRemoveTag={toggleSingleFilter}
        onClearAll={resetFilters}
      />

      <FilterDrawer
        open={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={filterGroups}
        currentFilters={filters}
        initialFilters={EMPTY_FILTERS}
        onApply={applyFilters}
        onReset={resetFilters}
      >
        {showProfileToggle && (
          <Toggle
            label="Selon mon profil"
            hint="Signale les ingrédients déconseillés pour votre type de peau"
            checked={profile_filter}
            onChange={handleProfileFilterChange}
            size="sm"
          />
        )}
      </FilterDrawer>

      <ListPageLayout.Body maxWidth="var(--list-browse-rail)" isSyncing={isPlaceholderData}>
        {isLoading && !isPlaceholderData ? (
          <EmptyState icon={<FlaskConical size={24} />} subtitle="Chargement..." />
        ) : items.length === 0 ? (
          showRateLimit ? (
            <RateLimitEmptyState error={error} />
          ) : (
            <EmptyState
              icon={<FlaskConical size={24} />}
              title={ingredientLabels.noResultsTitle}
              subtitle="Essayez de modifier vos filtres."
            />
          )
        ) : (
          <>
            <div className="list-grid">
              {items.map((ingredient) => {
                const avoidLabels = ingredient.profileMatches.map(
                  (s) =>
                    SKIN_TYPE_LABELS[s as keyof typeof SKIN_TYPE_LABELS] ??
                    SKIN_CONCERN_LABELS[s as keyof typeof SKIN_CONCERN_LABELS] ??
                    s
                )
                return (
                  <Card
                    key={ingredient.id}
                    as={Link as React.ElementType}
                    to="/ingredients/$slug"
                    params={{ slug: ingredient.slug }}
                    accent={
                      (ingredient.category && CATEGORY_ACCENTS[ingredient.category]) ||
                      DEFAULT_CATEGORY_ACCENT
                    }
                  >
                    <Card.Body>
                      <Card.Title
                        style={{ viewTransitionName: `ingredient-name-${ingredient.slug}` }}
                      >
                        {ingredient.name}
                      </Card.Title>
                      {ingredient.description && (
                        <Card.Description>{ingredient.description}</Card.Description>
                      )}
                    </Card.Body>
                    <Card.Footer>
                      {ingredient.profileMatches.length > 0 && (
                        <span title={`Déconseillé pour : ${avoidLabels.join(', ')}`}>
                          <Badge variant="avoided">
                            <AlertTriangle size={12} aria-hidden="true" /> Éviter
                          </Badge>
                        </span>
                      )}
                      <Badge variant="chip">{ingredient.category}</Badge>
                      <svg
                        className="ingredients-page__card-arrow"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        role="img"
                        aria-label="Voir l'ingrédient"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Card.Footer>
                  </Card>
                )
              })}
            </div>

            {totalPages > 1 && (
              <ListPagination currentPage={page} totalPages={totalPages} onPageChange={goToPage} />
            )}
          </>
        )}
      </ListPageLayout.Body>
    </ListPageLayout>
  )
}
