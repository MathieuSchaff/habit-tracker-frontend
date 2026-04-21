import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ChipGroup } from '../ChipGroup'

afterEach(() => cleanup())

describe('ChipGroup — count rendering', () => {
  it('does not render a count span when option.count is undefined', () => {
    const { container } = render(
      <ChipGroup
        options={[{ value: 'a', label: 'Alpha' }]}
        selected={[]}
        onChange={vi.fn()}
      />
    )
    expect(container.querySelector('.chip__count')).toBeNull()
  })

  it('renders the count next to the label when provided', () => {
    render(
      <ChipGroup
        options={[{ value: 'a', label: 'Alpha', count: 7 }]}
        selected={[]}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })

  it('exposes an accessible "(N résultats)" label via sr-only text', () => {
    render(
      <ChipGroup
        options={[{ value: 'a', label: 'Alpha', count: 3 }]}
        selected={[]}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText(/\(3 résultats\)/)).toBeInTheDocument()
  })

  it('shows count = 0 (not hidden) when explicitly zero', () => {
    render(
      <ChipGroup
        options={[{ value: 'a', label: 'Alpha', count: 0 }]}
        selected={[]}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('still toggles the chip when clicked (count does not swallow click)', () => {
    const handleChange = vi.fn()
    render(
      <ChipGroup
        options={[{ value: 'a', label: 'Alpha', count: 2 }]}
        selected={[]}
        onChange={handleChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Alpha/i }))
    expect(handleChange).toHaveBeenCalledWith(['a'])
  })
})
