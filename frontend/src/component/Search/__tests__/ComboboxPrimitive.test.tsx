import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ComboboxPrimitive } from '../ComboboxPrimitive'

type Item = { id: string; label: string }

const ITEMS_AB: Item[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
]

// Driver harness: ComboboxPrimitive is uncontrolled re: highlightedIndex; tests
// drive it via local state so we can assert internal keyboard handling.
function Harness({
  items = ITEMS_AB,
  isOpen = true,
  ...overrides
}: Partial<React.ComponentProps<typeof ComboboxPrimitive<Item>>> & {
  items?: Item[]
  isOpen?: boolean
}) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  return (
    <ComboboxPrimitive<Item>
      items={items}
      isOpen={isOpen}
      onClose={overrides.onClose ?? vi.fn()}
      onSelect={overrides.onSelect ?? vi.fn()}
      renderItem={(item) => <span>{item.label}</span>}
      keyExtractor={(item) => item.id}
      highlightedIndex={overrides.highlightedIndex ?? highlightedIndex}
      setHighlightedIndex={overrides.setHighlightedIndex ?? setHighlightedIndex}
      inputValue={overrides.inputValue ?? 'ab'}
      onKeyDown={overrides.onKeyDown}
      footer={overrides.footer}
      hasMore={overrides.hasMore}
      onLoadMore={overrides.onLoadMore}
      isLoadingMore={overrides.isLoadingMore}
      isLoading={overrides.isLoading}
      isError={overrides.isError}
      onRetry={overrides.onRetry}
      sections={overrides.sections}
    >
      {({ listboxId, activeDescendant }) => (
        <input
          type="text"
          // react-doctor-disable-next-line react-doctor/no-redundant-roles
          role="combobox"
          aria-label="Test"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          readOnly
        />
      )}
    </ComboboxPrimitive>
  )
}

describe('ComboboxPrimitive — click outside (capture + preventDefault)', () => {
  it('calls onClose when an outside click fires (capture phase intercept)', () => {
    const onClose = vi.fn()
    render(
      <div>
        <Harness onClose={onClose} />
        <button type="button" data-testid="outside-btn">
          outside
        </button>
      </div>
    )
    fireEvent.click(screen.getByTestId('outside-btn'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onClose when click is inside the trigger container', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.click(screen.getByRole('combobox'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does NOT call onClose when click is inside the portaled dropdown', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    // Listbox lives in a portal under document.body.
    fireEvent.click(screen.getByRole('listbox'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not register the listener when closed', () => {
    const onClose = vi.fn()
    render(
      <div>
        <Harness isOpen={false} onClose={onClose} />
        <button type="button" data-testid="outside-btn">
          outside
        </button>
      </div>
    )
    fireEvent.click(screen.getByTestId('outside-btn'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('ComboboxPrimitive — IntersectionObserver infinite scroll', () => {
  // Capture the IO callback per-instance so we can fire it deterministically.
  let observerCallback: IntersectionObserverCallback | null = null
  let observedTargets: Element[] = []
  let originalIO: typeof IntersectionObserver | undefined

  beforeEach(() => {
    observerCallback = null
    observedTargets = []
    originalIO = window.IntersectionObserver
    // Use a class so `new IntersectionObserver(...)` works; vi.fn() arrow impls
    // are not constructors and throw "is not a constructor" under React effects.
    class MockIO {
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb
      }
      observe(el: Element) {
        observedTargets.push(el)
      }
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    }
    window.IntersectionObserver = MockIO as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    if (originalIO) window.IntersectionObserver = originalIO
    observerCallback = null
    observedTargets = []
  })

  it('calls onLoadMore when the sentinel intersects (hasMore=true)', () => {
    const onLoadMore = vi.fn()
    render(<Harness hasMore onLoadMore={onLoadMore} />)
    expect(observerCallback).not.toBeNull()
    expect(observedTargets.length).toBeGreaterThan(0)

    // Simulate sentinel entering view.
    observerCallback?.(
      [
        {
          isIntersecting: true,
          target: observedTargets[0],
          intersectionRatio: 1,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver
    )

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onLoadMore when hasMore=false (no observer attached)', () => {
    const onLoadMore = vi.fn()
    render(<Harness hasMore={false} onLoadMore={onLoadMore} />)
    expect(observerCallback).toBeNull()
    expect(onLoadMore).not.toHaveBeenCalled()
  })
})

describe('ComboboxPrimitive — scrollIntoView on highlight change', () => {
  it('scrolls the active option into view when highlightedIndex changes', () => {
    const scrollSpy = vi.fn()
    // jsdom does not implement scrollIntoView; stub it.
    Element.prototype.scrollIntoView =
      scrollSpy as unknown as typeof Element.prototype.scrollIntoView

    const { rerender } = render(<Harness highlightedIndex={-1} setHighlightedIndex={vi.fn()} />)
    expect(scrollSpy).not.toHaveBeenCalled()

    rerender(<Harness highlightedIndex={1} setHighlightedIndex={vi.fn()} />)
    expect(scrollSpy).toHaveBeenCalled()
  })
})

describe('ComboboxPrimitive — footer prop', () => {
  it('renders footer below the items list', () => {
    render(<Harness footer={<div data-testid="cbx-footer">Custom footer</div>} />)
    expect(screen.getByTestId('cbx-footer')).toBeInTheDocument()
    expect(screen.getByTestId('cbx-footer')).toHaveTextContent('Custom footer')
  })

  it('suppresses the empty message when a footer is present', () => {
    // totalEntries=0 + inputValue non-empty + no footer would normally show empty.
    render(<Harness items={[]} footer={<div data-testid="cbx-footer">Fallback CTA</div>} />)
    expect(screen.queryByText(/Aucun résultat/)).not.toBeInTheDocument()
    expect(screen.getByTestId('cbx-footer')).toBeInTheDocument()
  })
})

describe('ComboboxPrimitive — onKeyDown parent intercept', () => {
  it('short-circuits internal switch when parent onKeyDown calls preventDefault', async () => {
    const setHighlightedIndex = vi.fn()
    const parentOnKeyDown = vi.fn((e: React.KeyboardEvent) => {
      // Parent claims the event (e.g. Tab handling).
      e.preventDefault()
    })
    render(
      <Harness
        onKeyDown={parentOnKeyDown}
        setHighlightedIndex={setHighlightedIndex}
        highlightedIndex={-1}
      />
    )
    const input = screen.getByRole('combobox')
    input.focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(parentOnKeyDown).toHaveBeenCalled()
    // Internal switch must not have run: highlightedIndex setter stays untouched.
    expect(setHighlightedIndex).not.toHaveBeenCalled()
  })

  it('runs the internal switch when parent onKeyDown does NOT preventDefault', async () => {
    const setHighlightedIndex = vi.fn()
    const parentOnKeyDown = vi.fn() // no preventDefault
    render(
      <Harness
        onKeyDown={parentOnKeyDown}
        setHighlightedIndex={setHighlightedIndex}
        highlightedIndex={-1}
      />
    )
    const input = screen.getByRole('combobox')
    input.focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(parentOnKeyDown).toHaveBeenCalled()
    expect(setHighlightedIndex).toHaveBeenCalledWith(0)
  })
})

describe('ComboboxPrimitive — error state', () => {
  it('renders error UI with retry button when isError', () => {
    const onRetry = vi.fn()
    render(<Harness isError onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/Erreur de recherche/)
    expect(screen.getByRole('button', { name: /Réessayer/i })).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn()
    render(<Harness isError onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /Réessayer/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('hides the listbox when isError', () => {
    render(<Harness isError onRetry={vi.fn()} />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
