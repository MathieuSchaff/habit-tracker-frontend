import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PriceFilterAccordion } from '../PriceFilterAccordion'

afterEach(() => cleanup())

describe('PriceFilterAccordion — wiring to PriceRangeFilter', () => {
  it('forwards the inner range commit through onChange (cents conversion intact)', () => {
    const onChange = vi.fn()
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
