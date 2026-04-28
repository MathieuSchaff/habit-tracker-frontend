import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PriceFilterAccordion } from '../PriceFilterAccordion'

afterEach(() => cleanup())

// The accordion uses native <details>; jsdom respects `open` on render but
// does not auto-toggle on `summary` click in older versions. Reading the
// `open` attribute reflects the React-controlled mount state, which is the
// only thing this component locks.
function getDetails(): HTMLDetailsElement {
  const el = document.querySelector('details')
  if (!el) throw new Error('PriceFilterAccordion did not render a <details> element')
  return el as HTMLDetailsElement
}

describe('PriceFilterAccordion — initial open state', () => {
  it('starts collapsed when neither min nor max is set', () => {
    render(<PriceFilterAccordion onChange={vi.fn()} />)
    expect(getDetails().open).toBe(false)
  })

  it('starts open when min is set on mount', () => {
    render(<PriceFilterAccordion min={1500} onChange={vi.fn()} />)
    expect(getDetails().open).toBe(true)
  })

  it('starts open when only max is set on mount', () => {
    render(<PriceFilterAccordion max={5000} onChange={vi.fn()} />)
    expect(getDetails().open).toBe(true)
  })

  it('starts open when both bounds are set on mount', () => {
    render(<PriceFilterAccordion min={1000} max={5000} onChange={vi.fn()} />)
    expect(getDetails().open).toBe(true)
  })
})

// Behavior the component leans on: the initial state is captured via lazy
// `useState(() => hasValue)` and the `open` prop is only read on mount. After
// that, ownership belongs to the browser's native toggle. Without this lock,
// a parent reset would yank the panel closed under the user's cursor.
describe('PriceFilterAccordion — initialOpen lock', () => {
  it('does not close itself when the price is cleared by the parent', () => {
    const { rerender } = render(<PriceFilterAccordion min={1000} onChange={vi.fn()} />)
    expect(getDetails().open).toBe(true)

    rerender(<PriceFilterAccordion onChange={vi.fn()} />)

    // Parent dropped the value (e.g. global reset). The native open state is
    // owned by the browser from now on; React must not flip it back.
    expect(getDetails().open).toBe(true)
  })

  it('does not open itself when the parent later sets a price', () => {
    const { rerender } = render(<PriceFilterAccordion onChange={vi.fn()} />)
    expect(getDetails().open).toBe(false)

    rerender(<PriceFilterAccordion min={1000} onChange={vi.fn()} />)

    // Same logic mirrored: React only honors `hasValue` at mount, never after.
    expect(getDetails().open).toBe(false)
  })
})

describe('PriceFilterAccordion — meta indicator', () => {
  it('shows the € marker when a price is active', () => {
    render(<PriceFilterAccordion min={1000} onChange={vi.fn()} />)
    expect(screen.getByTitle('Prix actif')).toBeInTheDocument()
  })

  it('hides the € marker when no price is set', () => {
    render(<PriceFilterAccordion onChange={vi.fn()} />)
    expect(screen.queryByTitle('Prix actif')).not.toBeInTheDocument()
  })
})

describe('PriceFilterAccordion — wiring to PriceRangeFilter', () => {
  it('forwards the inner range commit through onChange (cents conversion intact)', () => {
    const onChange = vi.fn()
    // Mount with a value so the accordion is open and the inputs are interactive.
    render(<PriceFilterAccordion min={1500} onChange={onChange} />)

    const minInput = screen.getByLabelText('Prix minimum en euros') as HTMLInputElement
    fireEvent.change(minInput, { target: { value: '20' } })
    fireEvent.blur(minInput)

    expect(onChange).toHaveBeenCalledWith({ min: 2000, max: undefined })
  })

  it('does not fire onChange just by mounting', () => {
    const onChange = vi.fn()
    render(<PriceFilterAccordion min={1000} max={5000} onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()
  })
})
