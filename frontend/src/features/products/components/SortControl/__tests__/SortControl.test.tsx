import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SortControl } from '../SortControl'

afterEach(() => cleanup())

describe('SortControl — rendering', () => {
  it('shows the current option label on the trigger', () => {
    render(<SortControl value="price_asc" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Tri : Prix croissant/i })).toBeInTheDocument()
  })

  it('falls back to first option when value is unknown', () => {
    render(<SortControl value={'unknown' as never} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Tri : Découverte/i })).toBeInTheDocument()
  })

  it('renders all 5 options when opened', () => {
    render(<SortControl value="name" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Tri :/i }))
    const menu = within(screen.getByRole('menu'))
    expect(menu.getByText('Découverte')).toBeInTheDocument()
    expect(menu.getByText('Nom (A-Z)')).toBeInTheDocument()
    expect(menu.getByText('Prix croissant')).toBeInTheDocument()
    expect(menu.getByText('Prix décroissant')).toBeInTheDocument()
    expect(menu.getByText('Nouveautés')).toBeInTheDocument()
  })
})

describe('SortControl — interaction', () => {
  it('calls onChange with the selected sort value', () => {
    const handleChange = vi.fn()
    render(<SortControl value="random" onChange={handleChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Tri :/i }))
    const menu = within(screen.getByRole('menu'))
    fireEvent.click(menu.getByText('Prix décroissant'))
    expect(handleChange).toHaveBeenCalledWith('price_desc')
  })
})
