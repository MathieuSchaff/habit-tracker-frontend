import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { FilterOption, GroupedFilterField } from '../../types'
import { SubGroupedChips } from '../SubGroupedChips'

type Key = 'tag'

const OPTIONS: FilterOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
  { value: 'd', label: 'Delta' },
  { value: 'e', label: 'Epsilon' },
]

function makeField(
  overrides: Partial<GroupedFilterField<Key>> = {}
): GroupedFilterField<Key> {
  return {
    key: 'tag',
    label: 'Tags',
    placeholder: '',
    options: OPTIONS,
    subGroups: [
      { label: 'Greek', slugs: ['a', 'b', 'c', 'd', 'e'] },
    ],
    ...overrides,
  }
}

describe('SubGroupedChips — rendering', () => {
  it('renders each sub-group with its legend and only its chips', () => {
    render(
      <SubGroupedChips
        field={makeField({
          subGroups: [
            { label: 'First', slugs: ['a', 'b'] },
            { label: 'Second', slugs: ['c', 'd'] },
          ],
        })}
        selected={[]}
        onToggle={vi.fn()}
        isAccordionOpen
        escapeHandler={() => {}}
      />
    )

    const first = screen.getAllByRole('group', { name: 'First' })[0]
    const second = screen.getAllByRole('group', { name: 'Second' })[0]
    expect(within(first).getByRole('button', { name: 'Alpha' })).toBeInTheDocument()
    expect(within(first).queryByRole('button', { name: 'Gamma' })).not.toBeInTheDocument()
    expect(within(second).getByRole('button', { name: 'Gamma' })).toBeInTheDocument()
  })

  it('drops a sub-group entirely when none of its slugs match the field options', () => {
    const { container } = render(
      <SubGroupedChips
        field={makeField({
          subGroups: [
            { label: 'Empty', slugs: ['nope-1', 'nope-2'] },
            { label: 'Real', slugs: ['a'] },
          ],
        })}
        selected={[]}
        onToggle={vi.fn()}
        isAccordionOpen
        escapeHandler={() => {}}
      />
    )
    expect(within(container).queryByText('Empty')).not.toBeInTheDocument()
    // Two matches expected: visible <legend> + sr-only legend inside ChipGroup.
    expect(within(container).getAllByText('Real').length).toBeGreaterThan(0)
  })

  it('falls back to a flat ChipGroup when subGroups is undefined', () => {
    render(
      <SubGroupedChips
        field={{ ...makeField(), subGroups: undefined }}
        selected={[]}
        onToggle={vi.fn()}
        isAccordionOpen
        escapeHandler={() => {}}
      />
    )
    // No fieldset/legend per sub-group, just chips for the flat option list.
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Epsilon' })).toBeInTheDocument()
  })
})

describe('SubGroupedChips — maxVisible', () => {
  it('shows only the first N chips with a "Voir tout" button when maxVisible < options', async () => {
    render(
      <SubGroupedChips
        field={makeField({
          subGroups: [{ label: 'Greek', slugs: ['a', 'b', 'c', 'd', 'e'], maxVisible: 3 }],
        })}
        selected={[]}
        onToggle={vi.fn()}
        isAccordionOpen
        escapeHandler={() => {}}
      />
    )
    // 3 chips visible + the "Voir tout" expand button.
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gamma' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Epsilon' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Voir les 5 options/ })).toBeInTheDocument()
  })

  it('reveals all chips after clicking the expand button', async () => {
    const user = userEvent.setup()
    render(
      <SubGroupedChips
        field={makeField({
          subGroups: [{ label: 'Greek', slugs: ['a', 'b', 'c', 'd', 'e'], maxVisible: 3 }],
        })}
        selected={[]}
        onToggle={vi.fn()}
        isAccordionOpen
        escapeHandler={() => {}}
      />
    )
    await user.click(screen.getByRole('button', { name: /Voir les 5 options/ }))

    expect(screen.getByRole('button', { name: 'Delta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Epsilon' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Voir les 5 options/ })).not.toBeInTheDocument()
  })
})

describe('SubGroupedChips — toggle', () => {
  it('calls onToggle with the slug of the clicked chip', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(
      <SubGroupedChips
        field={makeField()}
        selected={[]}
        onToggle={onToggle}
        isAccordionOpen
        escapeHandler={() => {}}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Beta' }))
    expect(onToggle).toHaveBeenCalledWith('b')
  })

  it('calls onToggle with the deselected slug when clicking an active chip', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(
      <SubGroupedChips
        field={makeField()}
        selected={['a', 'c']}
        onToggle={onToggle}
        isAccordionOpen
        escapeHandler={() => {}}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(onToggle).toHaveBeenCalledWith('a')
  })

  it('reflects the active selection across expand/collapse', async () => {
    const user = userEvent.setup()
    render(
      <SubGroupedChips
        field={makeField({
          subGroups: [{ label: 'Greek', slugs: ['a', 'b', 'c', 'd', 'e'], maxVisible: 3 }],
        })}
        selected={['e']}
        onToggle={vi.fn()}
        isAccordionOpen
        escapeHandler={() => {}}
      />
    )
    // 'e' is hidden behind the cap initially — expanding reveals it as already active.
    await user.click(screen.getByRole('button', { name: /Voir les 5 options/ }))
    expect(screen.getByRole('button', { name: 'Epsilon' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
})

describe('SubGroupedChips — escape handler', () => {
  it('forwards keydown events from chips to the escapeHandler prop', async () => {
    const escapeHandler = vi.fn()
    const user = userEvent.setup()
    render(
      <SubGroupedChips
        field={makeField()}
        selected={[]}
        onToggle={vi.fn()}
        isAccordionOpen
        escapeHandler={escapeHandler}
      />
    )
    const chip = screen.getByRole('button', { name: 'Alpha' })
    chip.focus()
    await user.keyboard('{Escape}')

    expect(escapeHandler).toHaveBeenCalledTimes(1)
    expect(escapeHandler.mock.calls[0][0].key).toBe('Escape')
  })
})

describe('SubGroupedChips — chipTabIndex follows accordion open state', () => {
  it('chips are tabbable when the accordion is open', () => {
    render(
      <SubGroupedChips
        field={makeField()}
        selected={[]}
        onToggle={vi.fn()}
        isAccordionOpen
        escapeHandler={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('tabindex', '0')
  })

  it('chips are removed from the tab order when the accordion is closed', () => {
    render(
      <SubGroupedChips
        field={makeField()}
        selected={[]}
        onToggle={vi.fn()}
        isAccordionOpen={false}
        escapeHandler={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('tabindex', '-1')
  })
})
