import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('FilterDrawer — Escape key (native cancel)', () => {
  it('closes WITHOUT applying when Escape fires the dialog cancel event', () => {
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
    // User stages a local change then escapes → draft must be discarded.
    fireEvent.click(screen.getByRole('button', { name: /Acné/i }))

    const dialog = document.querySelector('dialog') as HTMLDialogElement
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })
})

describe('FilterDrawer — backdrop click', () => {
  it('closes WITHOUT applying when the click target is the dialog itself (backdrop)', () => {
    const onClose = vi.fn()
    const onApply = vi.fn()
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
    const dialog = document.querySelector('dialog') as HTMLDialogElement
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('does NOT close when the click bubbles up from inside the panel', () => {
    const onClose = vi.fn()
    render(
      <FilterDrawer
        open={true}
        onClose={onClose}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('heading', { name: /Filtres/ }))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('FilterDrawer — currentFilters resync', () => {
  it('resets local state when currentFilters changes while open', () => {
    const onApply = vi.fn()
    const { rerender } = render(
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
    // User makes a local change, then the parent pushes a different snapshot
    // (e.g. URL state changed externally).
    fireEvent.click(screen.getByRole('button', { name: /Acné/i }))
    rerender(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={{ concern: ['anti-age'], skin_type: [] }}
        initialFilters={EMPTY}
        onApply={onApply}
        onReset={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Appliquer/i }))
    const payload = onApply.mock.calls[0]?.[0] as FilterValues<Key>
    // Local 'acne' was wiped by the resync to the new currentFilters.
    expect(payload.concern).toEqual(['anti-age'])
  })
})

describe('FilterDrawer — body scroll lock', () => {
  it('locks the body when open and releases on close', () => {
    const { rerender, unmount } = render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <FilterDrawer
        open={false}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    expect(document.body.style.position).toBe('')
    expect(document.body.style.overflow).toBe('')
    unmount()
  })
})

describe('FilterDrawer — focus restoration', () => {
  it('restores focus to the element that opened the drawer on close', async () => {
    const opener = document.createElement('button')
    opener.textContent = 'Open'
    document.body.appendChild(opener)
    opener.focus()
    expect(document.activeElement).toBe(opener)

    const onClose = vi.fn()
    render(
      <FilterDrawer
        open={true}
        onClose={onClose}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Fermer les filtres/i }))

    // handleClose schedules `previousFocusRef.current?.focus()` via setTimeout(0).
    await waitFor(() => {
      expect(document.activeElement).toBe(opener)
    })
    document.body.removeChild(opener)
  })
})

describe('FilterDrawer — async child does not block the drawer', () => {
  it('keeps the chips and footer interactive while a child query is pending', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    function PendingChild() {
      // Hangs forever — simulates a slow async loader injected into the drawer.
      useQuery({
        queryKey: ['pending'],
        queryFn: () => new Promise<never>(() => {}),
      })
      return <div data-testid="pending-child">loading...</div>
    }

    const onApply = vi.fn()
    render(
      <QueryClientProvider client={client}>
        <FilterDrawer
          open={true}
          onClose={vi.fn()}
          groups={GROUPS}
          currentFilters={EMPTY}
          initialFilters={EMPTY}
          onApply={onApply}
          onReset={vi.fn()}
        >
          <PendingChild />
        </FilterDrawer>
      </QueryClientProvider>
    )

    expect(screen.getByTestId('pending-child')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Acné/i }))
    fireEvent.click(screen.getByRole('button', { name: /Appliquer/i }))

    const payload = onApply.mock.calls[0]?.[0] as FilterValues<Key>
    expect(payload.concern).toEqual(['acne'])
    client.clear()
  })
})

// Regression guards for the "Maximum update depth" feedback loop documented
// in filter-drawer.md §5.2. The bug was a useEffect that emitted localFilters
// upward on every change — paired with an unmemoised parent `currentFilters`,
// it ping-ponged renders forever. Fix moved the emit to user-action paths
// (`commitLocal`). These tests pin that contract: opening the drawer must not
// emit; toggling emits exactly once; a fresh-but-equal `currentFilters` ref
// from the parent must not bubble back up.
describe('FilterDrawer — feedback loop guards (regression §5.2)', () => {
  it('does not call onLocalFiltersChange just by opening', () => {
    const onChange = vi.fn()
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
        onLocalFiltersChange={onChange}
      />
    )
    expect(onChange).not.toHaveBeenCalled()
  })

  it('emits exactly once per chip toggle (no effect-driven duplicate)', () => {
    const onChange = vi.fn()
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
        onLocalFiltersChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Acné/i }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]?.[0]).toEqual({ concern: ['acne'], skin_type: [] })
  })

  it('emits exactly once even when the parent ships a fresh currentFilters ref each render', () => {
    // Reproduces the unmemoised-parent shape that triggered the loop. Build a
    // brand-new `currentFilters` object on every rerender; the drawer must not
    // re-emit just because the ref changed.
    const onChange = vi.fn()
    const renderWithFreshRef = () => (
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={{ concern: [], skin_type: [] }}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
        onLocalFiltersChange={onChange}
      />
    )
    const { rerender } = render(renderWithFreshRef())
    rerender(renderWithFreshRef())
    rerender(renderWithFreshRef())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not log "Maximum update depth" on open or repeated toggles', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
        onLocalFiltersChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Acné/i }))
    fireEvent.click(screen.getByRole('button', { name: /Anti-âge/i }))
    fireEvent.click(screen.getByRole('button', { name: /Acné/i }))

    const offending = errSpy.mock.calls.find((args) =>
      args.some((arg) => typeof arg === 'string' && arg.includes('Maximum update depth'))
    )
    expect(offending).toBeUndefined()
    errSpy.mockRestore()
  })
})

// Native <dialog> already implies role="dialog" + aria-modal semantics, but
// we also set aria-modal and aria-labelledby explicitly so screen readers in
// jsdom-style environments report the title as the dialog name. These pin
// the contract.
describe('FilterDrawer — a11y attributes', () => {
  it('exposes aria-modal=true on the dialog', () => {
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    const dialog = document.querySelector('dialog') as HTMLDialogElement
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('links aria-labelledby to the title heading id', () => {
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    const dialog = document.querySelector('dialog') as HTMLDialogElement
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    const heading = document.getElementById(labelledBy as string)
    expect(heading).not.toBeNull()
    expect(heading?.tagName).toBe('H2')
    expect(heading?.textContent).toBe('Filtres')
  })

  it('groups advanced accordions inside a fieldset labelled "Filtres avancés"', () => {
    const advGroups: FilterGroupConfig<Key>[] = [
      ...GROUPS,
      {
        id: 'skin_type',
        label: 'Avancé',
        defaultOpen: false,
        tier: 'advanced',
        subFilters: [
          {
            key: 'skin_type',
            label: 'Avancé',
            placeholder: '',
            options: [{ value: 'peau-grasse', label: 'Grasse' }],
          },
        ],
      },
    ]
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={advGroups}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    const advFieldset = screen.getByRole('group', { name: 'Filtres avancés' })
    expect(advFieldset.tagName).toBe('FIELDSET')
  })

  it('does NOT render the advanced fieldset when no group has tier="advanced"', () => {
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    expect(screen.queryByRole('group', { name: 'Filtres avancés' })).not.toBeInTheDocument()
  })
})

describe('FilterDrawer — Apply button label', () => {
  it('reads "Appliquer" when previewCount is undefined', () => {
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    const apply = screen.getByRole('button', { name: /Appliquer les filtres sélectionnés/i })
    expect(apply).toHaveTextContent('Appliquer')
  })

  it('reads "Voir 1 produit" (singular) when previewCount=1', () => {
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
        previewCount={1}
      />
    )
    expect(screen.getByRole('button', { name: /Appliquer les filtres sélectionnés/i }))
      .toHaveTextContent('Voir 1 produit')
  })

  it('reads "Voir N produits" (plural) when previewCount > 1', () => {
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
        previewCount={42}
      />
    )
    expect(screen.getByRole('button', { name: /Appliquer les filtres sélectionnés/i }))
      .toHaveTextContent('Voir 42 produits')
  })

  it('reads "Voir 0 produit" (singular) when previewCount=0', () => {
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
        previewCount={0}
      />
    )
    expect(screen.getByRole('button', { name: /Appliquer les filtres sélectionnés/i }))
      .toHaveTextContent('Voir 0 produit')
  })
})

// ArrowDown/ArrowUp move focus between accordion triggers, but only when the
// trigger itself is focused — typing arrows inside a chip or input must not
// hijack focus.
describe('FilterDrawer — accordion trigger keyboard nav', () => {
  it('ArrowDown moves focus from the first trigger to the second', async () => {
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    const triggers = document.querySelectorAll<HTMLElement>('.filter-accordion__trigger')
    expect(triggers.length).toBe(2)
    triggers[0].focus()
    fireEvent.keyDown(triggers[0], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(triggers[1])
  })

  it('ArrowUp from the first trigger wraps to the last', () => {
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    const triggers = document.querySelectorAll<HTMLElement>('.filter-accordion__trigger')
    triggers[0].focus()
    fireEvent.keyDown(triggers[0], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(triggers[triggers.length - 1])
  })

  it('ArrowDown from the last trigger wraps to the first', () => {
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    const triggers = document.querySelectorAll<HTMLElement>('.filter-accordion__trigger')
    const last = triggers[triggers.length - 1]
    last.focus()
    fireEvent.keyDown(last, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(triggers[0])
  })

  it('does NOT hijack ArrowDown when focus is on a chip (only triggers move focus)', () => {
    render(
      <FilterDrawer
        open={true}
        onClose={vi.fn()}
        groups={GROUPS}
        currentFilters={EMPTY}
        initialFilters={EMPTY}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    )
    const chip = screen.getByRole('button', { name: /Acné/i })
    chip.focus()
    fireEvent.keyDown(chip, { key: 'ArrowDown' })
    // Focus stays on the chip — handleArrowNav guard ignores non-trigger targets.
    expect(document.activeElement).toBe(chip)
  })
})
