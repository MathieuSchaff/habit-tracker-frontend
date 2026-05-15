import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ShelfTabs } from '../ShelfTabs'

const counts = {
  in_stock: 3,
  wishlist: 1,
  watched: 0,
  archived: 0,
  avoided: 0,
} as const

describe('ShelfTabs', () => {
  it('renders a Tout tab with the sum of primary statuses only (excludes archived + avoided)', () => {
    render(
      <ShelfTabs
        active="all"
        onChange={() => {}}
        countsByStatus={counts}
        holyGrailCount={0}
        repurchaseCount={0}
      />
    )
    const tout = screen.getByRole('tab', { name: /tout/i })
    expect(tout).toHaveTextContent('4')
  })

  it('renders the renamed watched label "Garde un œil" with dimmed class when empty', () => {
    render(
      <ShelfTabs
        active="all"
        onChange={() => {}}
        countsByStatus={counts}
        holyGrailCount={0}
        repurchaseCount={0}
      />
    )
    const watched = screen.getByRole('tab', { name: /garde un œil/i })
    expect(watched).toBeInTheDocument()
    expect(watched.className).toMatch(/dimmed/)
  })

  it('invokes onChange("holy_grail") when Saint Graal is picked from the Plus menu', () => {
    const onChange = vi.fn()
    render(
      <ShelfTabs
        active="all"
        onChange={onChange}
        countsByStatus={counts}
        holyGrailCount={2}
        repurchaseCount={0}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /plus de filtres/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /saint graal/i }))
    expect(onChange).toHaveBeenCalledWith('holy_grail')
  })

  it('shows the active secondary filter on the Plus trigger', () => {
    render(
      <ShelfTabs
        active="holy_grail"
        onChange={() => {}}
        countsByStatus={counts}
        holyGrailCount={2}
        repurchaseCount={0}
      />
    )
    expect(screen.getByRole('button', { name: /filtre actif : saint graal/i })).toBeInTheDocument()
  })

  it('invokes onChange("repurchase") when À racheter is picked from the Plus menu', () => {
    const onChange = vi.fn()
    render(
      <ShelfTabs
        active="all"
        onChange={onChange}
        countsByStatus={counts}
        holyGrailCount={0}
        repurchaseCount={2}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /plus de filtres/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /à racheter/i }))
    expect(onChange).toHaveBeenCalledWith('repurchase')
  })
})
