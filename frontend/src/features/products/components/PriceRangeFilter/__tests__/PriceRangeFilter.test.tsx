import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PriceRangeFilter } from '../PriceRangeFilter'

afterEach(() => cleanup())

function getMin() {
  return screen.getByLabelText('Prix minimum en euros') as HTMLInputElement
}
function getMax() {
  return screen.getByLabelText('Prix maximum en euros') as HTMLInputElement
}

describe('PriceRangeFilter — rendering', () => {
  it('renders empty inputs when min/max are undefined', () => {
    render(<PriceRangeFilter onChange={vi.fn()} />)
    expect(getMin().value).toBe('')
    expect(getMax().value).toBe('')
  })

  it('displays cents as euros in the inputs', () => {
    render(<PriceRangeFilter min={1500} max={5000} onChange={vi.fn()} />)
    expect(getMin().value).toBe('15')
    expect(getMax().value).toBe('50')
  })

  it('stays in sync when props change from outside (reset case)', () => {
    const { rerender } = render(<PriceRangeFilter min={1000} onChange={vi.fn()} />)
    expect(getMin().value).toBe('10')
    rerender(<PriceRangeFilter onChange={vi.fn()} />)
    expect(getMin().value).toBe('')
  })
})

describe('PriceRangeFilter — commit', () => {
  it('commits on blur — converts euros to cents', () => {
    const onChange = vi.fn()
    render(<PriceRangeFilter onChange={onChange} />)
    fireEvent.change(getMin(), { target: { value: '12' } })
    fireEvent.blur(getMin())
    expect(onChange).toHaveBeenCalledWith({ min: 1200, max: undefined })
  })

  it('commits on Enter key', () => {
    const onChange = vi.fn()
    render(<PriceRangeFilter onChange={onChange} />)
    fireEvent.change(getMax(), { target: { value: '80' } })
    fireEvent.keyDown(getMax(), { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith({ min: undefined, max: 8000 })
  })

  it('clears the bound when the input is emptied', () => {
    const onChange = vi.fn()
    render(<PriceRangeFilter min={1500} onChange={onChange} />)
    fireEvent.change(getMin(), { target: { value: '' } })
    fireEvent.blur(getMin())
    expect(onChange).toHaveBeenCalledWith({ min: undefined, max: undefined })
  })

  it('does not call onChange if the value did not change', () => {
    const onChange = vi.fn()
    render(<PriceRangeFilter min={1500} onChange={onChange} />)
    fireEvent.blur(getMin())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ignores negative numbers (no-op when bounds stay undefined)', () => {
    const onChange = vi.fn()
    render(<PriceRangeFilter onChange={onChange} />)
    fireEvent.change(getMin(), { target: { value: '-5' } })
    fireEvent.blur(getMin())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clears a previously-set bound when a negative value is entered', () => {
    const onChange = vi.fn()
    render(<PriceRangeFilter min={1500} onChange={onChange} />)
    fireEvent.change(getMin(), { target: { value: '-5' } })
    fireEvent.blur(getMin())
    expect(onChange).toHaveBeenCalledWith({ min: undefined, max: undefined })
  })
})
