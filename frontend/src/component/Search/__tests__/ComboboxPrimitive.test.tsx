import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ComboboxPrimitive } from '../ComboboxPrimitive'
import { useCombobox } from '../useCombobox'

type Item = { id: string; label: string }

const ITEMS_AB: Item[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
]

type HarnessProps = {
  items?: Item[]
  isOpen?: boolean
  inputValue?: string
  onSelect?: (item: Item) => void
  onClose?: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  footer?: React.ReactNode
  hasMore?: boolean
  onLoadMore?: () => void
  isLoadingMore?: boolean
}

// Driver harness: state and keyboard live in useCombobox; tests exercise them
// through the primitive with real keyboard events.
function Harness({
  items = ITEMS_AB,
  isOpen = true,
  inputValue = 'ab',
  onSelect,
  onClose,
  onKeyDown,
  isLoading,
  isError,
  onRetry,
  footer,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: HarnessProps) {
  const combobox = useCombobox<Item>({
    items,
    onSelect: onSelect ?? (() => {}),
    onClose,
    onKeyDown,
    isLoading,
    isError,
  })
  const { open, close } = combobox
  // Tests declare the dropdown state via the isOpen prop; map it onto the hook intent.
  useEffect(() => {
    if (isOpen) open()
    else close()
  }, [isOpen, open, close])
  return (
    <ComboboxPrimitive<Item>
      combobox={combobox}
      inputValue={inputValue}
      onRetry={onRetry}
      footer={footer}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      isLoadingMore={isLoadingMore}
      renderItem={(item) => <span>{item.label}</span>}
      keyExtractor={(item) => item.id}
    >
      {({ listboxId, activeDescendant }) => (
        <input
          type="text"
          role="combobox"
          aria-label="Test"
          aria-expanded={combobox.isOpen}
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
  it('scrolls the active option into view when the highlight moves', async () => {
    const scrollSpy = vi.fn()
    // jsdom does not implement scrollIntoView; stub it.
    Element.prototype.scrollIntoView =
      scrollSpy as unknown as typeof Element.prototype.scrollIntoView

    render(<Harness />)
    expect(scrollSpy).not.toHaveBeenCalled()

    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{ArrowDown}')
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
    const parentOnKeyDown = vi.fn((e: React.KeyboardEvent) => {
      // Parent claims the event (e.g. Tab handling).
      e.preventDefault()
    })
    render(<Harness onKeyDown={parentOnKeyDown} />)
    const input = screen.getByRole('combobox')
    input.focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(parentOnKeyDown).toHaveBeenCalled()
    // Internal switch must not have run: nothing gets highlighted.
    expect(input).not.toHaveAttribute('aria-activedescendant')
    expect(screen.queryAllByRole('option', { selected: true })).toHaveLength(0)
  })

  it('runs the internal switch when parent onKeyDown does NOT preventDefault', async () => {
    const parentOnKeyDown = vi.fn() // no preventDefault
    render(<Harness onKeyDown={parentOnKeyDown} />)
    const input = screen.getByRole('combobox')
    input.focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(parentOnKeyDown).toHaveBeenCalled()
    expect(input).toHaveAttribute('aria-activedescendant')
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
  })
})

describe('ComboboxPrimitive — loading-state a11y', () => {
  it('ignores arrow nav while loading — no dangling aria-activedescendant', async () => {
    render(<Harness isLoading />)
    const input = screen.getByRole('combobox')
    input.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(input).not.toHaveAttribute('aria-activedescendant')
  })

  it('clears aria-activedescendant if loading starts with a residual highlight', async () => {
    const { rerender } = render(<Harness />)
    const input = screen.getByRole('combobox')
    input.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(input).toHaveAttribute('aria-activedescendant')

    rerender(<Harness isLoading />)
    expect(input).not.toHaveAttribute('aria-activedescendant')
  })

  it('Escape still closes while loading', async () => {
    const onClose = vi.fn()
    render(<Harness isLoading onClose={onClose} />)
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('suppresses the result-count live region while loading', () => {
    render(<Harness isLoading />)
    expect(screen.queryByText(/résultats disponibles/)).not.toBeInTheDocument()
  })
})

describe('ComboboxPrimitive — empty-state a11y', () => {
  // The empty-state <output> already announces; the count live region must not
  // speak over it nor advertise arrow keys that no-op with zero entries.
  it('suppresses the result-count live region when there are no results', () => {
    render(<Harness items={[]} inputValue="xyz" />)
    expect(screen.queryByText(/résultats disponibles/)).not.toBeInTheDocument()
  })
})

describe('ComboboxPrimitive — Escape propagation', () => {
  it('stops Escape while open; a second Escape reaches the parent (dialog peel)', () => {
    const onClose = vi.fn()
    const parentEsc = vi.fn()
    render(
      // biome-ignore lint/a11y/noStaticElementInteractions: test wrapper to assert Escape propagation is stopped
      <div onKeyDown={(e) => e.key === 'Escape' && parentEsc()}>
        <Harness onClose={onClose} />
      </div>
    )
    const input = screen.getByRole('combobox')

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(parentEsc).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(parentEsc).toHaveBeenCalledTimes(1)
  })
})

describe('ComboboxPrimitive — keyboard wrap', () => {
  it('ArrowDown on the last option wraps to the first, ArrowUp on the first wraps to the last', () => {
    render(<Harness />)
    const input = screen.getByRole('combobox')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-1'))
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-0'))

    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-1'))
  })
})

describe('ComboboxPrimitive — IME composition', () => {
  it('ignores Enter while composing: no select, nothing forwarded to the parent', () => {
    const onSelect = vi.fn()
    const onKeyDown = vi.fn()
    render(<Harness onSelect={onSelect} onKeyDown={onKeyDown} />)
    const input = screen.getByRole('combobox')

    // Highlight Bravo (index 1) through real keyboard nav, then reset the parent spy.
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    onKeyDown.mockClear()

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
    expect(onSelect).not.toHaveBeenCalled()
    expect(onKeyDown).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(ITEMS_AB[1])
  })
})

describe('ComboboxPrimitive — load-more status announcement', () => {
  let originalIO: typeof IntersectionObserver | undefined

  beforeEach(() => {
    originalIO = window.IntersectionObserver
    class MockIO {
      observe() {}
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
  })

  it('exposes the load-more Chargement… as role=status (not under aria-hidden)', () => {
    render(<Harness hasMore isLoadingMore />)
    expect(screen.getByRole('status')).toHaveTextContent('Chargement…')
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
