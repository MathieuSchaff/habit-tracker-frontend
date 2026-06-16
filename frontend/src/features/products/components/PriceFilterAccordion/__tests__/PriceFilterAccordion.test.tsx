import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PriceFilterAccordion } from '../PriceFilterAccordion'

afterEach(() => cleanup())

// jsdom honors `open` on render but doesn't auto-toggle on summary click; component locks mount state.
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

// An external apply (hasValue false->true, e.g. URL or chip) reopens the panel; clearing the
// price never auto-closes it under the user's cursor.
describe('PriceFilterAccordion — external value reaction', () => {
  it('does not close itself when the price is cleared by the parent', () => {
    const { rerender } = render(<PriceFilterAccordion min={1000} onChange={vi.fn()} />)
    expect(getDetails().open).toBe(true)

    rerender(<PriceFilterAccordion onChange={vi.fn()} />)

    expect(getDetails().open).toBe(true)
  })

  it('reopens when the parent applies a price externally', () => {
    const { rerender } = render(<PriceFilterAccordion onChange={vi.fn()} />)
    expect(getDetails().open).toBe(false)

    rerender(<PriceFilterAccordion min={1000} onChange={vi.fn()} />)

    expect(getDetails().open).toBe(true)
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
    // Mount with a value so the accordion is open.
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
