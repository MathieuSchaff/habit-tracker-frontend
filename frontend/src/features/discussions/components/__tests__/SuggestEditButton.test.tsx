import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProposeSuggestedEdit } from '@/lib/queries/suggested-edits'
import { renderWithProviders } from '@/test/utils'
import { SuggestEditButton } from '../SuggestEditButton'
import { SUGGEST_LABELS } from '../SuggestEditButton.constants'

vi.mock('@/lib/queries/suggested-edits', () => ({ useProposeSuggestedEdit: vi.fn() }))

type MutateFn = ReturnType<typeof useProposeSuggestedEdit>['mutate']
function setupMutation(overrides: { isPending?: boolean } = {}) {
  const mutate = vi.fn() as unknown as MutateFn
  vi.mocked(useProposeSuggestedEdit).mockReturnValue({
    mutate,
    isPending: overrides.isPending ?? false,
  } as unknown as ReturnType<typeof useProposeSuggestedEdit>)
  return mutate
}

beforeEach(() => {
  setupMutation()
})

describe('SuggestEditButton', () => {
  it('opens the modal and submits the trimmed value for the chosen field', async () => {
    const mutate = setupMutation()
    renderWithProviders(<SuggestEditButton targetType="product" targetId="prod-1" />)
    await userEvent.click(screen.getByRole('button', { name: SUGGEST_LABELS.action }))
    fireEvent.change(screen.getByLabelText(SUGGEST_LABELS.valueLabel), {
      target: { value: '  Corrected Name  ' },
    })
    await userEvent.click(screen.getByRole('button', { name: SUGGEST_LABELS.submit }))
    expect(mutate).toHaveBeenCalledWith(
      { targetType: 'product', targetId: 'prod-1', field: 'name', proposedValue: 'Corrected Name' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('blocks submit when the value is empty', async () => {
    const mutate = setupMutation()
    renderWithProviders(<SuggestEditButton targetType="ingredient" targetId="ing-1" />)
    await userEvent.click(screen.getByRole('button', { name: SUGGEST_LABELS.action }))
    await userEvent.click(screen.getByRole('button', { name: SUGGEST_LABELS.submit }))
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText(SUGGEST_LABELS.valueRequired)).toBeInTheDocument()
  })

  it('offers only ingredient fields for an ingredient target', async () => {
    renderWithProviders(<SuggestEditButton targetType="ingredient" targetId="ing-1" />)
    await userEvent.click(screen.getByRole('button', { name: SUGGEST_LABELS.action }))
    const select = screen.getByLabelText(SUGGEST_LABELS.fieldLabel) as HTMLSelectElement
    const values = Array.from(select.options).map((o) => o.value)
    expect(values).toEqual(['name', 'description'])
  })
})
