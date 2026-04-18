import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BulkBar } from '../BulkBar'

describe('BulkBar', () => {
  it('renders nothing when no items are selected', () => {
    const { container } = render(
      <BulkBar selectedCount={0} onMove={() => {}} onClear={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the selected count with correct pluralization', () => {
    const { rerender } = render(
      <BulkBar selectedCount={1} onMove={() => {}} onClear={() => {}} />,
    )
    expect(screen.getByText(/produit sélectionné$/)).toBeInTheDocument()
    rerender(<BulkBar selectedCount={3} onMove={() => {}} onClear={() => {}} />)
    expect(screen.getByText(/produits sélectionnés/)).toBeInTheDocument()
  })

  it('calls onClear when the × button is pressed', () => {
    const onClear = vi.fn()
    render(<BulkBar selectedCount={2} onMove={() => {}} onClear={onClear} />)
    fireEvent.click(screen.getByLabelText(/annuler/i))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('opens the picker and calls onMove with the chosen status', () => {
    const onMove = vi.fn()
    render(<BulkBar selectedCount={2} onMove={onMove} onClear={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /déplacer vers/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /saint graal/i }))
    expect(onMove).toHaveBeenCalledWith('holy_grail')
  })
})
