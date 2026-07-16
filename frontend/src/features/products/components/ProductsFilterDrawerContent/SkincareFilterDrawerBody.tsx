import clsx from 'clsx'
import { type ReactNode, useId, useMemo, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { FilterAccordion } from '@/component/Filter/FilterAccordion/FilterAccordion'
import type { FilterGroupConfig, FilterValues } from '@/component/Filter/types'
import type { FilterKey } from '@/features/products/filters'
import { SearchIntentPicker } from './SearchIntentPicker'
import {
  DRAWER_GROUP_LABELS,
  PREFERENCE_AND_MORE_GROUPS,
  PRODUCT_GROUPS,
  SKIN_GROUPS,
} from './SkincareFilterDrawerBody.config'

import './SkincareFilterDrawerBody.css'

type Props = {
  groups: FilterGroupConfig<FilterKey>[]
  localFilters: FilterValues<FilterKey>
  onToggle: (key: FilterKey, value: string) => void
  onFiltersChange: (filters: FilterValues<FilterKey>) => void
  priceFilter: ReactNode
}

function presentGroup(
  group: FilterGroupConfig<FilterKey>,
  localFilters: FilterValues<FilterKey>,
  defaultOpen: boolean
): FilterGroupConfig<FilterKey> {
  return {
    ...group,
    label: DRAWER_GROUP_LABELS[group.id] ?? group.label,
    defaultOpen,
    subFilters: group.subFilters.map((field) => {
      const selected = localFilters[field.key] ?? []
      // Options arrive pre-ordered from the hook (alpha, or defs order for
      // semantic categories); only filter out unavailable-and-unselected here.
      const availableOptions = field.options.filter(
        (option) => !option.disabled || selected.includes(option.value)
      )

      return {
        ...field,
        label: DRAWER_GROUP_LABELS[field.key] ?? field.label,
        options: availableOptions,
      }
    }),
  }
}

function FilterGroupList({
  ids,
  groupsById,
  localFilters,
  onToggle,
  openFirst = false,
}: {
  ids: readonly string[]
  groupsById: Map<string, FilterGroupConfig<FilterKey>>
  localFilters: FilterValues<FilterKey>
  onToggle: (key: FilterKey, value: string) => void
  openFirst?: boolean
}) {
  return ids.map((id, index) => {
    const group = groupsById.get(id)
    if (!group) return null

    return (
      <FilterAccordion
        key={group.id}
        group={presentGroup(group, localFilters, openFirst && index === 0)}
        localFilters={localFilters}
        onToggle={onToggle}
      />
    )
  })
}

function DrawerSection({
  title,
  description,
  step,
  className,
  children,
}: {
  title: string
  description?: string
  step?: string
  className?: string
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section
      className={clsx('skincare-filter-drawer__section', className)}
      aria-labelledby={headingId}
    >
      <div className="skincare-filter-drawer__section-heading">
        {step ? <span className="skincare-filter-drawer__step">{step}</span> : null}
        <h3 id={headingId}>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function SkincareFilterDrawerBody({
  groups,
  localFilters,
  onToggle,
  onFiltersChange,
  priceFilter,
}: Props) {
  const groupsById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups])
  const [path, setPath] = useState<'product' | 'skin'>(() => {
    const hasProductFilter =
      localFilters.product_type_v2.length > 0 || localFilters.texture.length > 0
    return hasProductFilter ? 'product' : 'skin'
  })

  return (
    <div className="skincare-filter-drawer">
      <DrawerSection
        title="Comment voulez-vous commencer ?"
        step="Étape 1"
        className="skincare-filter-drawer__path-picker"
      >
        <div className="skincare-filter-drawer__path-options">
          <Button
            variant="bare"
            className={clsx('skincare-filter-drawer__path', path === 'product' && 'is-active')}
            onClick={() => setPath('product')}
            aria-pressed={path === 'product'}
          >
            <strong>Je sais ce que je cherche</strong>
            <span>Crème, nettoyant, sérum…</span>
          </Button>
          <Button
            variant="bare"
            className={clsx('skincare-filter-drawer__path', path === 'skin' && 'is-active')}
            onClick={() => setPath('skin')}
            aria-pressed={path === 'skin'}
          >
            <strong>Je pars de ma peau</strong>
            <span>Besoin, type de peau, zone…</span>
          </Button>
        </div>
      </DrawerSection>

      {path === 'product' ? (
        <>
          <DrawerSection
            title="Choisissez un raccourci"
            description="Chaque raccourci combine plusieurs critères visibles, que vous pourrez affiner."
          >
            <SearchIntentPicker
              groups={groups}
              localFilters={localFilters}
              onFiltersChange={onFiltersChange}
            />
          </DrawerSection>
          <DrawerSection title="Affinez le produit">
            <FilterGroupList
              ids={PRODUCT_GROUPS}
              groupsById={groupsById}
              localFilters={localFilters}
              onToggle={onToggle}
            />
          </DrawerSection>
          <DrawerSection title="Ajoutez un besoin de peau">
            <FilterGroupList
              ids={SKIN_GROUPS}
              groupsById={groupsById}
              localFilters={localFilters}
              onToggle={onToggle}
            />
          </DrawerSection>
        </>
      ) : (
        <>
          <DrawerSection
            title="Décrivez votre peau"
            description="Les besoins passent avant la forme du produit."
          >
            <FilterGroupList
              ids={SKIN_GROUPS}
              groupsById={groupsById}
              localFilters={localFilters}
              onToggle={onToggle}
              openFirst
            />
          </DrawerSection>
          <DrawerSection title="Choisissez ensuite le produit">
            <FilterGroupList
              ids={PRODUCT_GROUPS}
              groupsById={groupsById}
              localFilters={localFilters}
              onToggle={onToggle}
            />
          </DrawerSection>
        </>
      )}

      <DrawerSection title="Préférences et critères avancés">
        <FilterGroupList
          ids={PREFERENCE_AND_MORE_GROUPS}
          groupsById={groupsById}
          localFilters={localFilters}
          onToggle={onToggle}
        />
        {priceFilter}
      </DrawerSection>
    </div>
  )
}
