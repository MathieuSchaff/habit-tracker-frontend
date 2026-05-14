import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactElement, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { FilterOption } from '../../types'
import { SearchSelect } from '../SearchSelect'

const OPTIONS: FilterOption[] = [
  { value: 'niacinamide', label: 'Niacinamide' },
  { value: 'niacin-pca', label: 'Niacin PCA' },
  { value: 'retinol', label: 'Retinol' },
  { value: 'azelaic-acid', label: 'Azelaic Acid' },
  { value: 'salicylic-acid', label: 'Salicylic Acid' },
  { value: 'glycerin', label: 'Glycerin' },
  { value: 'hyaluronic-acid', label: 'Hyaluronic Acid' },
  { value: 'centella', label: 'Centella Asiatica' },
  { value: 'squalane', label: 'Squalane' },
  { value: 'matrixyl', label: 'Matrixyl 3000' },
]

function makeManyOptions(n: number): FilterOption[] {
  return Array.from({ length: n }, (_, i) => ({
    value: `opt-${i}`,
    label: `Option ${i}`,
  }))
}

const baseProps = {
  options: OPTIONS,
  selected: [],
  onToggle: vi.fn(),
  label: 'Ingrédients',
  placeholder: 'Rechercher...',
}

function renderSelect(ui: ReactElement = <SearchSelect {...baseProps} onToggle={vi.fn()} />) {
  return render(ui)
}

describe('SearchSelect — filter', () => {
  it('reduces the list to options matching the query', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    await user.type(input, 'nia')

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
    expect(options.map((o) => o.textContent)).toEqual(['Niacinamide', 'Niacin PCA'])
  })

  it('restores the full list when the query is cleared', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    await user.type(input, 'nia')
    await user.clear(input)
    // Re-focus so dropdown stays open after clear
    input.focus()

    const options = screen.getAllByRole('option')
    expect(options.length).toBe(OPTIONS.length)
  })

  it('matches case-insensitively', async () => {
    const user = userEvent.setup()
    renderSelect()
    await user.type(screen.getByRole('combobox'), 'NIA')

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
  })
})

describe('SearchSelect — selection', () => {
  it('calls onToggle with the option value and resets the query on click', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    renderSelect(<SearchSelect {...baseProps} onToggle={onToggle} />)

    const input = screen.getByRole('combobox') as HTMLInputElement
    await user.type(input, 'nia')
    await user.click(screen.getByRole('option', { name: 'Niacinamide' }))

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith('niacinamide')
    expect(input.value).toBe('')
  })

  it('hides already-selected options from the dropdown', async () => {
    const user = userEvent.setup()
    renderSelect(<SearchSelect {...baseProps} selected={['niacinamide']} onToggle={vi.fn()} />)
    await user.type(screen.getByRole('combobox'), 'nia')

    const options = screen.getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['Niacin PCA'])
  })

  it('toggles the selection when clicking a selected chip', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    renderSelect(<SearchSelect {...baseProps} selected={['retinol']} onToggle={onToggle} />)
    await user.click(screen.getByRole('button', { name: /Retirer Retinol/i }))
    expect(onToggle).toHaveBeenCalledWith('retinol')
  })
})

describe('SearchSelect — lazy load', () => {
  it('caps the initial dropdown to PAGE_SIZE (50)', async () => {
    const user = userEvent.setup()
    const many = makeManyOptions(120)
    renderSelect(<SearchSelect {...baseProps} options={many} onToggle={vi.fn()} />)

    await user.click(screen.getByRole('combobox'))

    expect(screen.getAllByRole('option')).toHaveLength(50)
  })

  it('grows by PAGE_SIZE when the dropdown is scrolled to the bottom', async () => {
    const user = userEvent.setup()
    const many = makeManyOptions(120)
    renderSelect(<SearchSelect {...baseProps} options={many} onToggle={vi.fn()} />)
    await user.click(screen.getByRole('combobox'))

    const listbox = screen.getByRole('listbox')
    // Force scroll-to-bottom: scrollTop+clientHeight >= scrollHeight - 5
    Object.defineProperty(listbox, 'scrollHeight', { value: 1000, configurable: true })
    Object.defineProperty(listbox, 'clientHeight', { value: 200, configurable: true })
    Object.defineProperty(listbox, 'scrollTop', { value: 800, configurable: true })
    fireEvent.scroll(listbox)

    expect(screen.getAllByRole('option')).toHaveLength(100)
  })
})

describe('SearchSelect — keyboard', () => {
  it('ArrowDown opens the dropdown and sets activeIndex=0', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    input.focus()
    await user.keyboard('{ArrowDown}')

    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-0'))
  })

  it('ArrowDown twice advances activeIndex to 1 without overflowing', async () => {
    const user = userEvent.setup()
    const tiny: FilterOption[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]
    renderSelect(<SearchSelect {...baseProps} options={tiny} onToggle={vi.fn()} />)
    const input = screen.getByRole('combobox')
    input.focus()
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}')

    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-1'))
  })

  it('ArrowUp from activeIndex=0 returns focus to the input', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    input.focus()
    await user.keyboard('{ArrowDown}{ArrowUp}')

    expect(document.activeElement).toBe(input)
  })

  it('Enter on the active option calls onToggle and resets the query', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    renderSelect(<SearchSelect {...baseProps} onToggle={onToggle} />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    await user.type(input, 'nia')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onToggle).toHaveBeenCalledWith('niacinamide')
    expect(input.value).toBe('')
  })

  it('Enter while closed re-opens the dropdown', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    input.focus()
    await user.keyboard('{Tab}') // close
    expect(input).toHaveAttribute('aria-expanded', 'false')
    input.focus()
    await user.keyboard('{Enter}')
    expect(input).toHaveAttribute('aria-expanded', 'true')
  })

  it('Escape closes the dropdown and stops propagation', async () => {
    const parentEsc = vi.fn()
    const user = userEvent.setup()
    render(
      <div onKeyDown={(e) => e.key === 'Escape' && parentEsc()}>
        <SearchSelect {...baseProps} onToggle={vi.fn()} />
      </div>
    )
    const input = screen.getByRole('combobox')
    input.focus()
    await user.keyboard('{ArrowDown}{Escape}')

    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(parentEsc).not.toHaveBeenCalled()
  })

  it('Tab closes the dropdown', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    input.focus()
    await user.keyboard('{ArrowDown}')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Tab}')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('SearchSelect — a11y', () => {
  it('aria-expanded follows isOpen', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    await user.click(input)
    expect(input).toHaveAttribute('aria-expanded', 'true')
  })

  it('aria-controls points to the listbox when open', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    await user.click(input)
    const listbox = screen.getByRole('listbox')
    expect(input.getAttribute('aria-controls')).toBe(listbox.id)
  })

  it('aria-activedescendant tracks the active option id', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    input.focus()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-1'))
  })

  it('polite live region announces result count when query has matches', async () => {
    const user = userEvent.setup()
    const { container } = renderSelect()
    await user.type(screen.getByRole('combobox'), 'nia')
    const polite = container.querySelector('[aria-live="polite"]') as HTMLElement
    expect(polite).toBeTruthy()
    expect(polite.textContent).toMatch(/2 résultats disponibles/)
  })

  it('assertive live region announces "X ajouté" on toggle', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    const { container } = renderSelect(<SearchSelect {...baseProps} onToggle={onToggle} />)
    await user.type(screen.getByRole('combobox'), 'nia')
    await user.click(screen.getByRole('option', { name: 'Niacinamide' }))
    const assertive = container.querySelector('[aria-live="assertive"]') as HTMLElement
    expect(assertive.textContent).toBe('Niacinamide ajouté')
  })
})

describe('SearchSelect — click outside', () => {
  it('closes the dropdown and clears the query on outside mousedown', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <SearchSelect {...baseProps} onToggle={vi.fn()} />
        <div data-testid="outside">outside</div>
      </div>
    )
    const input = screen.getByRole('combobox') as HTMLInputElement
    await user.type(input, 'nia')
    expect(input).toHaveAttribute('aria-expanded', 'true')

    fireEvent.mouseDown(screen.getByTestId('outside'))

    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input.value).toBe('')
  })

  it('stays open when mousedown happens inside the component', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    await user.type(input, 'nia')

    fireEvent.mouseDown(within(screen.getByRole('listbox')).getAllByRole('option')[0])

    expect(input).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('SearchSelect — empty state', () => {
  it('shows "Aucun résultat" when query has no matches', async () => {
    const user = userEvent.setup()
    renderSelect()
    await user.type(screen.getByRole('combobox'), 'zzzzz')
    expect(screen.getAllByText(/Aucun résultat/).length).toBeGreaterThan(0)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('SearchSelect — controlled selected (integration)', () => {
  it('reflects toggling through the parent state', async () => {
    function Harness() {
      const [sel, setSel] = useState<string[]>([])
      return (
        <SearchSelect
          {...baseProps}
          selected={sel}
          onToggle={(v) =>
            setSel((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))
          }
        />
      )
    }
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByRole('combobox'), 'reti')
    await user.click(screen.getByRole('option', { name: 'Retinol' }))

    // Chip appears, option disappears from dropdown.
    expect(screen.getByRole('button', { name: /Retirer Retinol/i })).toBeInTheDocument()
  })
})

describe('SearchSelect — keyboard edge cases', () => {
  it('clamps activeIndex at the last filtered option (no overflow)', async () => {
    const user = userEvent.setup()
    const tiny: FilterOption[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]
    renderSelect(<SearchSelect {...baseProps} options={tiny} onToggle={vi.fn()} />)
    const input = screen.getByRole('combobox')
    input.focus()
    // 6 ArrowDown on 2 options must not push activedescendant past option-1
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}')
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-1'))
  })

  it('returns focus to the input after selecting an option via mouse', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    await user.type(input, 'nia')
    await user.click(screen.getByRole('option', { name: 'Niacinamide' }))
    expect(document.activeElement).toBe(input)
  })

  it('returns focus to the input after the dismiss button is clicked', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    await user.click(input)
    const dismiss = screen.getByRole('button', { name: /Fermer la liste/i })
    fireEvent.mouseDown(dismiss)
    expect(document.activeElement).toBe(input)
  })

  it('Enter/Space on the dismiss button also closes the dropdown', async () => {
    const user = userEvent.setup()
    renderSelect()
    const input = screen.getByRole('combobox')
    await user.click(input)
    expect(input).toHaveAttribute('aria-expanded', 'true')

    const dismiss = screen.getByRole('button', { name: /Fermer la liste/i })
    fireEvent.keyDown(dismiss, { key: 'Enter' })
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('SearchSelect — selected chip a11y', () => {
  it('exposes a "Retirer X" aria-label on each selected chip', () => {
    renderSelect(
      <SearchSelect {...baseProps} selected={['retinol', 'glycerin']} onToggle={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /Retirer Retinol/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Retirer Glycerin/i })).toBeInTheDocument()
  })
})
