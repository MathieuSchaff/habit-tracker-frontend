import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ShelfTabs } from '../ShelfTabs'

const counts = {
  holy_grail: 2,
  in_stock: 3,
  wishlist: 1,
  watched: 0,
  archived: 0,
  avoided: 0,
} as const

describe('ShelfTabs', () => {
  it('renders a Tout tab with the sum of all statuses', () => {
    render(<ShelfTabs active="all" onChange={() => {}} countsByStatus={counts} />)
    const tout = screen.getByRole('tab', { name: /tout/i })
    expect(tout).toHaveTextContent('6')
  })

  it('marks empty shelves with the dimmed class but still renders them', () => {
    render(<ShelfTabs active="all" onChange={() => {}} countsByStatus={counts} />)
    const watched = screen.getByRole('tab', { name: /surveille/i })
    expect(watched).toBeInTheDocument()
    expect(watched.className).toMatch(/dimmed/)
  })

  it('invokes onChange with the new key on click', () => {
    const onChange = vi.fn()
    render(<ShelfTabs active="all" onChange={onChange} countsByStatus={counts} />)
    fireEvent.click(screen.getByRole('tab', { name: /saint graal/i }))
    expect(onChange).toHaveBeenCalledWith('holy_grail')
  })

  it('only the active tab has tabIndex=0', () => {
    render(<ShelfTabs active="holy_grail" onChange={() => {}} countsByStatus={counts} />)
    const grail = screen.getByRole('tab', { name: /saint graal/i })
    expect(grail).toHaveAttribute('tabindex', '0')
    const wishlist = screen.getByRole('tab', { name: /wishlist/i })
    expect(wishlist).toHaveAttribute('tabindex', '-1')
  })
})
