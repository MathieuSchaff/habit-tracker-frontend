import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { FilterGroupConfig } from '@/component/Filter'
import { emptyFilters } from '@/features/products/__tests__/fixtures'
import type { FilterKey } from '@/features/products/filters'
import { ProductsFilterDrawerContent } from '../ProductsFilterDrawerContent'
import { PRODUCTS_FILTER_DRAWER_COPY } from '../ProductsFilterDrawerContent.copy'

const PROFILE_TOGGLE_NAME = new RegExp(PRODUCTS_FILTER_DRAWER_COPY.profileToggleLabel, 'i')

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
  {
    id: 'product_type_v2',
    label: 'Type de produit',
    defaultOpen: false,
    tier: 'essential',
    subFilters: [
      {
        key: 'product_type_v2',
        label: 'Type de produit',
        placeholder: 'Tous',
        options: [
          { value: 'type-hydratant', label: 'Hydratant', count: 12 },
          { value: 'type-nettoyant', label: 'Nettoyant', count: 8 },
        ],
      },
    ],
  },
  {
    id: 'texture',
    label: 'Forme - Galénique',
    defaultOpen: false,
    tier: 'essential',
    subFilters: [
      {
        key: 'texture',
        label: 'Forme - Galénique',
        placeholder: 'Toutes',
        options: [
          { value: 'texture-creme', label: 'Crème', count: 10 },
          { value: 'texture-gel', label: 'Gel', count: 7 },
        ],
      },
    ],
  },
]

const EMPTY = emptyFilters()

function renderContent(
  overrides: Partial<React.ComponentProps<typeof ProductsFilterDrawerContent>> = {}
) {
  const props = {
    open: true,
    onClose: vi.fn(),
    groups: GROUPS,
    currentFilters: EMPTY,
    initialFilters: EMPTY,
    onApply: vi.fn(),
    onReset: vi.fn(),
    category: 'skincare' as const,
    showProfileToggle: true,
    profileFilter: false,
    onProfileFilterChange: vi.fn(),
    onPriceChange: vi.fn(),
    onLocalFiltersChange: vi.fn(),
    ...overrides,
  }
  return { props, ...render(<ProductsFilterDrawerContent {...props} />) }
}

describe('ProductsFilterDrawerContent — skincare intent-first journey', () => {
  it('explains and applies the composed Crème hydratante shortcut', () => {
    const onLocalFiltersChange = vi.fn()
    renderContent({ onLocalFiltersChange })

    fireEvent.click(screen.getByRole('button', { name: /Je sais ce que je cherche/i }))

    const shortcut = screen.getByRole('button', {
      name: /Crème hydratante.*Hydratant \+ Crème/i,
    })
    fireEvent.click(shortcut)

    expect(shortcut).toHaveAttribute('aria-pressed', 'true')
    expect(onLocalFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        product_type_v2: ['type-hydratant'],
        texture: ['texture-creme'],
      })
    )
  })

  it('disables a shortcut when one of its canonical options is absent', () => {
    renderContent()

    fireEvent.click(screen.getByRole('button', { name: /Je sais ce que je cherche/i }))

    expect(screen.getByRole('button', { name: /Sérum.*Sérum \/ Concentré/i })).toBeDisabled()
  })

  it('replaces the previous shortcut axes while preserving manual refinements', () => {
    const onLocalFiltersChange = vi.fn()
    renderContent({ onLocalFiltersChange })

    fireEvent.click(screen.getByRole('button', { name: /Je sais ce que je cherche/i }))
    fireEvent.click(screen.getByRole('button', { name: /Crème hydratante/i }))
    fireEvent.click(screen.getByRole('button', { name: /Acné/i }))
    fireEvent.click(screen.getByRole('button', { name: /Gel nettoyant/i }))

    expect(onLocalFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        concern: ['acne-imperfections'],
        product_type_v2: ['type-nettoyant'],
        texture: ['texture-gel'],
      })
    )
  })

  it('keeps the standard taxonomy drawer for non-skincare domains', () => {
    renderContent({ category: 'haircare', showProfileToggle: false })

    expect(
      screen.queryByRole('button', { name: /Je sais ce que je cherche/i })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Acné/i })).toBeInTheDocument()
  })
})

// Profile toggle bypasses the draft flow — it navigates immediately (parent owns URL).
describe('ProductsFilterDrawerContent — profile toggle bypasses draft', () => {
  it('renders the toggle when showProfileToggle=true', () => {
    renderContent()
    expect(screen.getByRole('switch', { name: PROFILE_TOGGLE_NAME })).toBeInTheDocument()
  })

  it('does not render the toggle when showProfileToggle=false', () => {
    renderContent({ showProfileToggle: false })
    expect(screen.queryByRole('switch', { name: PROFILE_TOGGLE_NAME })).not.toBeInTheDocument()
  })

  it('flipping the toggle calls onProfileFilterChange and never onLocalFiltersChange', () => {
    const onProfileFilterChange = vi.fn()
    const onLocalFiltersChange = vi.fn()
    renderContent({ onProfileFilterChange, onLocalFiltersChange })

    fireEvent.click(screen.getByRole('switch', { name: PROFILE_TOGGLE_NAME }))

    expect(onProfileFilterChange).toHaveBeenCalledTimes(1)
    expect(onProfileFilterChange).toHaveBeenCalledWith(true)
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
    expect(screen.getByRole('switch', { name: PROFILE_TOGGLE_NAME })).not.toBeChecked()

    rerender(<ProductsFilterDrawerContent {...props} profileFilter={true} />)
    expect(screen.getByRole('switch', { name: PROFILE_TOGGLE_NAME })).toBeChecked()
  })
})
