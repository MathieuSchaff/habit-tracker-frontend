import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { FilterGroupConfig } from '@/component/Filter'
import type { FilterKey } from '@/features/products/filters'
import { ProductsFilterDrawerContent } from '../ProductsFilterDrawerContent'

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '')
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open')
    }
  }
})

afterEach(() => cleanup())

const GROUPS: FilterGroupConfig<FilterKey>[] = [
  {
    id: 'concern',
    label: 'Problème',
    defaultOpen: true,
    tier: 'essential',
    subFilters: [
      {
        key: 'concern',
        label: 'Problème',
        placeholder: 'Toutes',
        options: [{ value: 'acne-imperfections', label: 'Acné' }],
      },
    ],
  },
]

const EMPTY = {
  brand: [],
  ingredient: [],
  kind: [],
  concern: [],
  skin_type: [],
  skin_zone: [],
  product_type: [],
  routine_step: [],
  hair_type: [],
  routine_step_hair: [],
  hair_effect: [],
  texture: [],
  finish: [],
  sensoriality: [],
  product_label: [],
  application_moment: [],
  benefit_dental: [],
} as never

function renderContent(overrides: Partial<React.ComponentProps<typeof ProductsFilterDrawerContent>> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    groups: GROUPS,
    currentFilters: EMPTY,
    initialFilters: EMPTY,
    onApply: vi.fn(),
    onReset: vi.fn(),
    showProfileToggle: true,
    profileFilter: false,
    onProfileFilterChange: vi.fn(),
    onPriceChange: vi.fn(),
    onLocalFiltersChange: vi.fn(),
    ...overrides,
  }
  return { props, ...render(<ProductsFilterDrawerContent {...props} />) }
}

// The profile toggle is a super-filter that lives outside the drawer's draft
// flow: toggling it navigates immediately (parent owns the URL) instead of
// staging a change for Apply. Pin that contract so a future refactor that
// routes the toggle through commitLocal would fail loudly here.
describe('ProductsFilterDrawerContent — profile toggle bypasses draft (§10.6)', () => {
  it('renders the toggle when showProfileToggle=true', () => {
    renderContent()
    expect(screen.getByRole('switch', { name: /Selon mon profil/i })).toBeInTheDocument()
  })

  it('does not render the toggle when showProfileToggle=false', () => {
    renderContent({ showProfileToggle: false })
    expect(screen.queryByRole('switch', { name: /Selon mon profil/i })).not.toBeInTheDocument()
  })

  it('flipping the toggle calls onProfileFilterChange and never onLocalFiltersChange', () => {
    const onProfileFilterChange = vi.fn()
    const onLocalFiltersChange = vi.fn()
    renderContent({ onProfileFilterChange, onLocalFiltersChange })

    fireEvent.click(screen.getByRole('switch', { name: /Selon mon profil/i }))

    expect(onProfileFilterChange).toHaveBeenCalledTimes(1)
    expect(onProfileFilterChange).toHaveBeenCalledWith(true)
    // No draft side-effect: the toggle is a parent-owned URL flag, not a chip.
    expect(onLocalFiltersChange).not.toHaveBeenCalled()
  })

  it('chip clicks emit through the draft channel — proves the two channels stay independent', () => {
    const onProfileFilterChange = vi.fn()
    const onLocalFiltersChange = vi.fn()
    renderContent({ onProfileFilterChange, onLocalFiltersChange })

    fireEvent.click(screen.getByRole('button', { name: /Acné/i }))

    expect(onLocalFiltersChange).toHaveBeenCalledTimes(1)
    expect(onProfileFilterChange).not.toHaveBeenCalled()
  })

  it('reflects the profile state from props (controlled, not internal state)', () => {
    const { rerender, props } = renderContent({ profileFilter: false })
    expect(screen.getByRole('switch', { name: /Selon mon profil/i })).not.toBeChecked()

    rerender(<ProductsFilterDrawerContent {...props} profileFilter={true} />)
    expect(screen.getByRole('switch', { name: /Selon mon profil/i })).toBeChecked()
  })
})
