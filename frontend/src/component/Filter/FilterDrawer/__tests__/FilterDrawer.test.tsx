import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { FilterGroupConfig, FilterValues } from '../../types'
import { FilterDrawer } from '../FilterDrawer'

// jsdom does not implement <dialog>.showModal()/close() — stub them so the
// drawer's open/close lifecycle can run without throwing.
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

type Key = 'concern' | 'skin_type'

const GROUPS: FilterGroupConfig<Key>[] = [
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
        options: [
          { value: 'acne', label: 'Acné' },
          { value: 'anti-age', label: 'Anti-âge' },
        ],
      },
    ],
  },
  {
    id: 'skin_type',
    label: 'Peau',
    defaultOpen: true,
    tier: 'essential',
    subFilters: [
      {
        key: 'skin_type',
        label: 'Peau',
        placeholder: 'Tous',
        options: [{ value: 'peau-grasse', label: 'Grasse' }],
      },
    ],
  },
]

const EMPTY: FilterValues<Key> = { concern: [], skin_type: [] }

describe('FilterDrawer — open/close lifecycle', () => {
  it('does not apply or close when the dialog is just opened', () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(
      <FilterDrawer
        open={true}
        onClose={onClose}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={onApply}
        onReset={vi.fn()}
      />
    )
    expect(onApply).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('FilterDrawer — modify + apply flow', () => {
  it('commits the modified selection when "Appliquer" is clicked', () => {
    const onApply = vi.fn()
    const onClose = vi.fn()

    render(
      <FilterDrawer
        open={true}
        onClose={onClose}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={onApply}
        onReset={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Acné/i }))
    fireEvent.click(screen.getByRole('button', { name: /Appliquer/i }))

    expect(onApply).toHaveBeenCalledTimes(1)
    const payload = onApply.mock.calls[0]?.[0] as FilterValues<Key>
    expect(payload.concern).toEqual(['acne'])
    expect(payload.skin_type).toEqual([])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('toggles a chip off when clicked again (deselects)', () => {
    const onApply = vi.fn()
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={{ concern: ['acne'], skin_type: [] }}
        initialFilters={EMPTY}
        onApply={onApply}
        onReset={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Acné/i }))
    fireEvent.click(screen.getByRole('button', { name: /Appliquer/i }))
    const payload = onApply.mock.calls[0]?.[0] as FilterValues<Key>
    expect(payload.concern).toEqual([])
  })

  it('supports OR within a category (multiple selections of same key)', () => {
    const onApply = vi.fn()
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={onApply}
        onReset={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Acné/i }))
    fireEvent.click(screen.getByRole('button', { name: /Anti-âge/i }))
    fireEvent.click(screen.getByRole('button', { name: /Appliquer/i }))
    const payload = onApply.mock.calls[0]?.[0] as FilterValues<Key>
    expect(payload.concern.sort()).toEqual(['acne', 'anti-age'])
  })
})

describe('FilterDrawer — reset', () => {
  it('calls onReset and wipes local state back to initialFilters', () => {
    const onApply = vi.fn()
    const onReset = vi.fn()
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={{ concern: ['acne'], skin_type: [] }}
        initialFilters={EMPTY}
        onApply={onApply}
        onReset={onReset}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Réinitialiser/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
    // After reset, applying should commit the empty state (not the original currentFilters)
    fireEvent.click(screen.getByRole('button', { name: /Appliquer/i }))
    const payload = onApply.mock.calls[0]?.[0] as FilterValues<Key>
    expect(payload.concern).toEqual([])
  })
})

describe('FilterDrawer — extra children', () => {
  it('renders injected children at the top of the body', () => {
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      >
        <div data-testid="extra-slot">Hello</div>
      </FilterDrawer>
    )
    expect(screen.getByTestId('extra-slot')).toBeInTheDocument()
  })
})
