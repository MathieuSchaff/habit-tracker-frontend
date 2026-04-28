import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type {
  AsyncSearchQueryFactory,
  FilterGroupConfig,
  FilterOption,
  FilterValues,
} from '../../types'
import { FilterAccordion } from '../FilterAccordion'

type Key = 'concern' | 'ingredient' | 'kind' | 'tag'

const OPTS: Record<string, FilterOption[]> = {
  concern: [
    { value: 'acne', label: 'Acné' },
    { value: 'aging', label: 'Vieillissement' },
  ],
  kind: [
    { value: 'cleanser', label: 'Nettoyant' },
    { value: 'serum', label: 'Sérum' },
  ],
  ingredient: [
    { value: 'retinol', label: 'Retinol' },
    { value: 'niacinamide', label: 'Niacinamide' },
  ],
  tag: [
    { value: 't-a', label: 'Tag A' },
    { value: 't-b', label: 'Tag B' },
    { value: 't-c', label: 'Tag C' },
  ],
}

const noopAsync: AsyncSearchQueryFactory<string, FilterOption[]> = (q) => ({
  queryKey: ['x', q],
  queryFn: async () => [],
})
const noopResolve: AsyncSearchQueryFactory<string[], FilterOption[]> = (slugs) => ({
  queryKey: ['y', [...slugs].sort()],
  queryFn: async () => [],
})

function makeGroup(
  overrides: Partial<FilterGroupConfig<Key>> = {}
): FilterGroupConfig<Key> {
  return {
    id: 'g1',
    label: 'Concern',
    defaultOpen: false,
    tier: 'essential',
    subFilters: [
      {
        key: 'concern',
        label: 'Problème',
        placeholder: 'Toutes',
        options: OPTS.concern,
      },
    ],
    ...overrides,
  }
}

const emptyFilters: FilterValues<Key> = {
  concern: [],
  ingredient: [],
  kind: [],
  tag: [],
}

function renderAccordion(
  ui: ReactElement,
  { withQuery = false }: { withQuery?: boolean } = {}
) {
  if (!withQuery) return render(ui)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('FilterAccordion — variant routing', () => {
  it('renders ChipGroup for the default chips variant', async () => {
    const onToggle = vi.fn()
    renderAccordion(
      <FilterAccordion
        group={makeGroup({ defaultOpen: true })}
        localFilters={emptyFilters}
        onToggle={onToggle}
      />
    )

    // Chips show as toggle buttons.
    const acne = screen.getByRole('button', { name: 'Acné' })
    expect(acne).toBeInTheDocument()
    await userEvent.click(acne)
    expect(onToggle).toHaveBeenCalledWith('concern', 'acne')
  })

  it('renders SearchSelect when variant === "search-select"', () => {
    renderAccordion(
      <FilterAccordion
        group={makeGroup({
          defaultOpen: true,
          subFilters: [
            {
              key: 'kind',
              label: 'Type',
              placeholder: 'Tous',
              options: OPTS.kind,
              variant: 'search-select',
            },
          ],
        })}
        localFilters={emptyFilters}
        onToggle={vi.fn()}
      />
    )

    expect(screen.getByRole('combobox', { name: /Type/i })).toBeInTheDocument()
  })

  it('renders AsyncSearchSelect when variant === "async-search-select" and both factories are present', () => {
    renderAccordion(
      <FilterAccordion
        group={makeGroup({
          defaultOpen: true,
          subFilters: [
            {
              key: 'ingredient',
              label: 'Ingrédient',
              placeholder: 'Rechercher...',
              options: [],
              variant: 'async-search-select',
              loadOptionsQuery: noopAsync,
              resolveValuesQuery: noopResolve,
            },
          ],
        })}
        localFilters={emptyFilters}
        onToggle={vi.fn()}
      />,
      { withQuery: true }
    )

    expect(screen.getByRole('combobox', { name: /Ingrédient/i })).toBeInTheDocument()
  })

  it('returns null (no crash) when async variant is missing loadOptionsQuery', () => {
    renderAccordion(
      <FilterAccordion
        group={makeGroup({
          defaultOpen: true,
          subFilters: [
            {
              key: 'ingredient',
              label: 'Ingrédient',
              placeholder: '',
              options: [],
              variant: 'async-search-select',
              resolveValuesQuery: noopResolve,
            },
          ],
        })}
        localFilters={emptyFilters}
        onToggle={vi.fn()}
      />
    )
    // Header still renders, but no combobox/inputs for that field.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('returns null when async variant is missing resolveValuesQuery', () => {
    renderAccordion(
      <FilterAccordion
        group={makeGroup({
          defaultOpen: true,
          subFilters: [
            {
              key: 'ingredient',
              label: 'Ingrédient',
              placeholder: '',
              options: [],
              variant: 'async-search-select',
              loadOptionsQuery: noopAsync,
            },
          ],
        })}
        localFilters={emptyFilters}
        onToggle={vi.fn()}
      />
    )
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('renders SubGroupedChips when the field has subGroups', () => {
    renderAccordion(
      <FilterAccordion
        group={makeGroup({
          defaultOpen: true,
          subFilters: [
            {
              key: 'tag',
              label: 'Tags',
              placeholder: '',
              options: OPTS.tag,
              subGroups: [
                { label: 'Sous A', slugs: ['t-a', 't-b'] },
                { label: 'Sous B', slugs: ['t-c'] },
              ],
            },
          ],
        })}
        localFilters={emptyFilters}
        onToggle={vi.fn()}
      />
    )

    // Each sub-group renders a fieldset with its label as legend.
    // Two groups match each name (outer subgroup fieldset + inner ChipGroup fieldset),
    // assert at least one for each.
    expect(screen.getAllByRole('group', { name: 'Sous A' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('group', { name: 'Sous B' }).length).toBeGreaterThan(0)
    // Slugs from the right sub-group land in their respective ChipGroup.
    expect(screen.getByRole('button', { name: 'Tag A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tag C' })).toBeInTheDocument()
  })
})

describe('FilterAccordion — header behavior', () => {
  it('expands at mount when defaultOpen=true', () => {
    const { container } = renderAccordion(
      <FilterAccordion
        group={makeGroup({ defaultOpen: true })}
        localFilters={emptyFilters}
        onToggle={vi.fn()}
      />
    )
    expect((container.querySelector('details') as HTMLDetailsElement).open).toBe(true)
  })

  it('expands at mount when defaultOpen=false but a sub-filter has selections', () => {
    const { container } = renderAccordion(
      <FilterAccordion
        group={makeGroup({ defaultOpen: false })}
        localFilters={{ ...emptyFilters, concern: ['acne'] }}
        onToggle={vi.fn()}
      />
    )
    expect((container.querySelector('details') as HTMLDetailsElement).open).toBe(true)
  })

  it('toggles open/closed on header click', async () => {
    const user = userEvent.setup()
    const { container } = renderAccordion(
      <FilterAccordion
        group={makeGroup({ defaultOpen: false })}
        localFilters={emptyFilters}
        onToggle={vi.fn()}
      />
    )
    const details = container.querySelector('details') as HTMLDetailsElement
    const trigger = container.querySelector('summary') as HTMLElement
    expect(details.open).toBe(false)

    await user.click(trigger)
    expect(details.open).toBe(true)

    await user.click(trigger)
    expect(details.open).toBe(false)
  })

  it('shows a count badge when selections exist', () => {
    renderAccordion(
      <FilterAccordion
        group={makeGroup({
          defaultOpen: true,
          subFilters: [
            {
              key: 'concern',
              label: 'Problème',
              placeholder: '',
              options: OPTS.concern,
            },
            {
              key: 'kind',
              label: 'Type',
              placeholder: '',
              options: OPTS.kind,
            },
          ],
        })}
        localFilters={{ ...emptyFilters, concern: ['acne'], kind: ['serum'] }}
        onToggle={vi.fn()}
      />
    )
    // Total = 2 selections across sub-filters.
    expect(screen.getByTitle(/2 filtres actifs/)).toHaveTextContent('2')
  })

  it('reflects the tier as a CSS class on the wrapper', () => {
    const { container } = renderAccordion(
      <FilterAccordion
        group={makeGroup({ tier: 'advanced', defaultOpen: true })}
        localFilters={emptyFilters}
        onToggle={vi.fn()}
      />
    )
    expect(container.querySelector('.filter-accordion--advanced')).toBeInTheDocument()
  })
})

describe('FilterAccordion — escape propagation', () => {
  it('Escape on a chip closes the accordion and refocuses the trigger', async () => {
    const user = userEvent.setup()
    const { container } = renderAccordion(
      <FilterAccordion
        group={makeGroup({ defaultOpen: true })}
        localFilters={emptyFilters}
        onToggle={vi.fn()}
      />
    )
    const details = container.querySelector('details') as HTMLDetailsElement
    const trigger = container.querySelector('summary') as HTMLElement
    expect(details.open).toBe(true)

    const acne = screen.getByRole('button', { name: 'Acné' })
    acne.focus()
    await user.keyboard('{Escape}')

    expect(details.open).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })
})

describe('FilterAccordion — open state', () => {
  it('renders a closed <details> when defaultOpen=false and no selections', () => {
    const { container } = renderAccordion(
      <FilterAccordion
        group={makeGroup({ defaultOpen: false })}
        localFilters={emptyFilters}
        onToggle={vi.fn()}
      />
    )
    const details = container.querySelector('details') as HTMLDetailsElement
    expect(details.open).toBe(false)
  })
})

describe('FilterAccordion — multi sub-filters', () => {
  it('shows the sub-filter label only when there are multiple sub-filters', () => {
    // Single sub-filter: no nested label expected on the chip group wrapper.
    const { container, rerender } = renderAccordion(
      <FilterAccordion
        group={makeGroup({ defaultOpen: true })}
        localFilters={emptyFilters}
        onToggle={vi.fn()}
      />
    )
    expect(within(container).queryByText('Problème')).not.toBeInTheDocument()

    rerender(
      <FilterAccordion
        group={makeGroup({
          defaultOpen: true,
          subFilters: [
            {
              key: 'concern',
              label: 'Problème',
              placeholder: '',
              options: OPTS.concern,
            },
            { key: 'kind', label: 'Type', placeholder: '', options: OPTS.kind },
          ],
        })}
        localFilters={emptyFilters}
        onToggle={vi.fn()}
      />
    )
    expect(within(container).getByText('Problème')).toBeInTheDocument()
    expect(within(container).getByText('Type')).toBeInTheDocument()
  })
})
