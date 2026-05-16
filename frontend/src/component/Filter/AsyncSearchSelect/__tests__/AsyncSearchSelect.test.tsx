import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { type ReactElement, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'
import type { AsyncSearchQueryFactory, FilterOption } from '../../types'
import { AsyncSearchSelect } from '../AsyncSearchSelect'

// Real factories hit MSW endpoints so the test exercises the same path as production.
const loadOptionsQuery: AsyncSearchQueryFactory<string, FilterOption[]> = (q) => ({
  queryKey: ['ing-search', q],
  queryFn: async () => {
    const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(q)}`)
    if (!res.ok) throw new Error('search failed')
    const json = (await res.json()) as {
      data: { slug: string; name: string }[]
    }
    return json.data.map((r) => ({ value: r.slug, label: r.name }))
  },
})

const resolveValuesQuery: AsyncSearchQueryFactory<string[], FilterOption[]> = (slugs) => ({
  queryKey: ['ing-resolve', [...slugs].sort()],
  queryFn: async () => {
    const res = await fetch(`/api/ingredients/by-slugs?slugs=${slugs.join(',')}`)
    if (!res.ok) throw new Error('resolve failed')
    const json = (await res.json()) as {
      data: { slug: string; name: string }[]
    }
    return json.data.map((r) => ({ value: r.slug, label: r.name }))
  },
})

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  })
}

function renderASS(ui: ReactElement, client = makeClient()) {
  return {
    client,
    ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>),
  }
}

// Tracks matched MSW requests so tests can assert call counts without binding to fetch.
let requestLog: string[] = []
beforeEach(() => {
  requestLog = []
  server.events.on('request:match', ({ request }) => {
    requestLog.push(request.url)
  })
})
afterEach(() => {
  server.events.removeAllListeners()
})

const baseProps = {
  selected: [],
  onToggle: vi.fn(),
  loadOptionsQuery,
  resolveValuesQuery,
  label: 'Ingrédients',
  placeholder: 'Rechercher...',
  // Small debounce keeps real-timer tests fast.
  debounce: 30,
}

const searchCalls = () => requestLog.filter((u) => u.includes('/api/ingredients/search'))
const resolveCalls = () => requestLog.filter((u) => u.includes('/api/ingredients/by-slugs'))

describe('AsyncSearchSelect — debounce + gating', () => {
  it('does not call loadOptionsQuery while below minChars', async () => {
    const user = userEvent.setup()
    renderASS(<AsyncSearchSelect {...baseProps} onToggle={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'n')
    // Wait past the debounce — still no request because below minChars (default 2).
    await new Promise((r) => setTimeout(r, 80))

    expect(searchCalls()).toHaveLength(0)
    expect(screen.getByText(/Tapez au moins 2 caractères/i)).toBeInTheDocument()
  })

  it('fires a single search request after rapid typing crossing minChars', async () => {
    const user = userEvent.setup()
    renderASS(<AsyncSearchSelect {...baseProps} onToggle={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'nia')

    await waitFor(() => {
      expect(searchCalls().length).toBeGreaterThan(0)
    })
    // Debounce collapses 'n', 'ni', 'nia' → one fetch with q=nia.
    expect(searchCalls()).toHaveLength(1)
    expect(searchCalls()[0]).toContain('q=nia')
  })

  it('shows "Recherche…" while the search is in flight', async () => {
    server.use(
      http.get('*/api/ingredients/search', async () => {
        await new Promise((r) => setTimeout(r, 50))
        return HttpResponse.json({ success: true, data: [] })
      })
    )
    const user = userEvent.setup()
    renderASS(<AsyncSearchSelect {...baseProps} onToggle={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'ni')

    await waitFor(() => {
      expect(screen.getByText(/Recherche…/)).toBeInTheDocument()
    })
  })
})

describe('AsyncSearchSelect — resolve chips', () => {
  it('does not call resolveValuesQuery when selected is empty', async () => {
    renderASS(<AsyncSearchSelect {...baseProps} selected={[]} onToggle={vi.fn()} />)
    // Nothing async to await — give React Query a tick.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(resolveCalls()).toHaveLength(0)
  })

  it('resolves chip labels for a deep-linked slug list', async () => {
    renderASS(
      <AsyncSearchSelect {...baseProps} selected={['retinol', 'niacinamide']} onToggle={vi.fn()} />
    )

    // Before the resolve completes, chip should render the raw slug.
    expect(screen.getByRole('button', { name: /Retirer retinol/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Retirer Retinol/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Retirer Niacinamide/i })).toBeInTheDocument()
    })

    expect(resolveCalls()).toHaveLength(1)
    expect(resolveCalls()[0]).toMatch(/slugs=retinol(,| %2C)niacinamide/)
  })
})

describe('AsyncSearchSelect — label cache merge', () => {
  it('merges labels learned via search into chips', async () => {
    const Harness = () => {
      const [sel, setSel] = useState<string[]>([])
      return (
        <AsyncSearchSelect
          {...baseProps}
          selected={sel}
          onToggle={(v) =>
            setSel((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))
          }
        />
      )
    }
    const user = userEvent.setup()
    renderASS(<Harness />)

    await user.type(screen.getByRole('combobox'), 'nia')
    const opt = await screen.findByRole('option', { name: /Niacinamide/i })
    await user.click(opt)

    // Chip uses the label, not the slug — confirms label cache is populated by
    // the search response (not a fresh resolve call).
    expect(screen.getByRole('button', { name: /Retirer Niacinamide/i })).toBeInTheDocument()
  })
})

describe('AsyncSearchSelect — filtre dropdown', () => {
  it('hides already-selected options from the dropdown', async () => {
    const user = userEvent.setup()
    renderASS(<AsyncSearchSelect {...baseProps} selected={['niacinamide']} onToggle={vi.fn()} />)
    await user.type(screen.getByRole('combobox'), 'nia')

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Niacin PCA/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('option', { name: /^Niacinamide$/i })).not.toBeInTheDocument()
  })
})

describe('AsyncSearchSelect — keyboard', () => {
  it('Enter on the active option toggles it and resets the query', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    renderASS(<AsyncSearchSelect {...baseProps} onToggle={onToggle} />)

    const input = screen.getByRole('combobox') as HTMLInputElement
    await user.type(input, 'nia')
    await screen.findByRole('option', { name: /Niacinamide/i })
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith('niacinamide')
    expect(input.value).toBe('')
  })

  it('Escape closes the dropdown and stops propagation', async () => {
    const onToggle = vi.fn()
    const parentEsc = vi.fn()
    const user = userEvent.setup()
    renderASS(
      // biome-ignore lint/a11y/noStaticElementInteractions: test wrapper to assert Escape propagation is stopped
      <div onKeyDown={(e) => e.key === 'Escape' && parentEsc()}>
        <AsyncSearchSelect {...baseProps} onToggle={onToggle} />
      </div>
    )

    const input = screen.getByRole('combobox')
    await user.type(input, 'nia')
    await screen.findByRole('option', { name: /Niacinamide/i })
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('option', { name: /Niacinamide/i })).not.toBeInTheDocument()
    expect(parentEsc).not.toHaveBeenCalled()
  })

  it('Tab closes the dropdown', async () => {
    const user = userEvent.setup()
    renderASS(<AsyncSearchSelect {...baseProps} onToggle={vi.fn()} />)
    const input = screen.getByRole('combobox')
    await user.type(input, 'nia')
    await screen.findByRole('option', { name: /Niacinamide/i })
    await user.keyboard('{Tab}')
    await waitFor(() => {
      expect(screen.queryByRole('option', { name: /Niacinamide/i })).not.toBeInTheDocument()
    })
  })
})

describe('AsyncSearchSelect — empty + error states', () => {
  it('shows "Aucun résultat" when search returns []', async () => {
    server.use(
      http.get('*/api/ingredients/search', () => HttpResponse.json({ success: true, data: [] }))
    )
    const user = userEvent.setup()
    renderASS(<AsyncSearchSelect {...baseProps} onToggle={vi.fn()} />)
    await user.type(screen.getByRole('combobox'), 'zz')
    // Two nodes match (visible <p> + aria-live region) — assert at least one.
    await waitFor(() => {
      expect(screen.getAllByText(/Aucun résultat/).length).toBeGreaterThan(0)
    })
  })

  it('does not crash when the search request fails (500)', async () => {
    server.use(
      http.get('*/api/ingredients/search', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 })
      )
    )
    const user = userEvent.setup()
    renderASS(<AsyncSearchSelect {...baseProps} onToggle={vi.fn()} />)
    await user.type(screen.getByRole('combobox'), 'ni')
    // Component remains mounted, no thrown error in render.
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})

describe('AsyncSearchSelect — click outside', () => {
  it('closes the dropdown and clears the query on outside mousedown', async () => {
    const user = userEvent.setup()
    renderASS(
      <div>
        <AsyncSearchSelect {...baseProps} onToggle={vi.fn()} />
        <div data-testid="outside">outside</div>
      </div>
    )
    const input = screen.getByRole('combobox') as HTMLInputElement
    await user.type(input, 'nia')
    await screen.findByRole('option', { name: /Niacinamide/i })

    await user.click(screen.getByTestId('outside'))

    await waitFor(() => {
      expect(screen.queryByRole('option', { name: /Niacinamide/i })).not.toBeInTheDocument()
    })
    expect(input.value).toBe('')
  })
})

describe('AsyncSearchSelect — régression positionnement (2026-04-26)', () => {
  // Regression: effect deps were `[showDropdown]` only, so it fired before the
  // listbox mounted (ref null, empty coords). `filtered.length` re-triggers it.
  it('sets non-empty inline coords on the dropdown once it shows', async () => {
    const user = userEvent.setup()
    renderASS(<AsyncSearchSelect {...baseProps} onToggle={vi.fn()} />)
    await user.type(screen.getByRole('combobox'), 'nia')

    const dropdown = await screen.findByRole('listbox')
    await waitFor(
      () => {
        expect(dropdown.style.left).not.toBe('')
        expect(dropdown.style.maxHeight).not.toBe('')
        expect(dropdown.style.top !== '' || dropdown.style.bottom !== '').toBe(true)
      },
      { timeout: 200 }
    )
  })
})

describe('AsyncSearchSelect — positionnement', () => {
  let rectMock: DOMRect
  let rectSpy: ReturnType<typeof vi.spyOn>
  let originalOffsetHeight: PropertyDescriptor | undefined

  beforeEach(() => {
    rectMock = {
      top: 100,
      bottom: 130,
      left: 50,
      right: 250,
      width: 200,
      height: 30,
      x: 50,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect
    rectSpy = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(() => rectMock)

    // jsdom returns 0 for offsetHeight; force a non-trivial value so the
    // flip-up arithmetic has something to compare against.
    originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 200,
    })
  })

  afterEach(() => {
    rectSpy.mockRestore()
    if (originalOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
    } else {
      // biome-ignore lint/performance/noDelete: restoring jsdom default
      delete (HTMLElement.prototype as unknown as { offsetHeight?: number }).offsetHeight
    }
  })

  it('flips above when there is no room below', async () => {
    // wrapper near viewport bottom (jsdom default innerHeight 768) → spaceBelow
    // tiny, dropdownHeight (200) larger → placeAbove path.
    rectMock = { ...rectMock, top: 740, bottom: 760, y: 740 } as DOMRect
    const user = userEvent.setup()
    renderASS(<AsyncSearchSelect {...baseProps} onToggle={vi.fn()} />)
    await user.type(screen.getByRole('combobox'), 'nia')

    const dropdown = await screen.findByRole('listbox')
    await waitFor(() => {
      expect(dropdown.style.top).toBe('auto')
      expect(dropdown.style.bottom).not.toBe('auto')
      expect(dropdown.style.bottom).not.toBe('')
    })
  })

  it('updates position on window resize', async () => {
    const user = userEvent.setup()
    renderASS(<AsyncSearchSelect {...baseProps} onToggle={vi.fn()} />)
    await user.type(screen.getByRole('combobox'), 'nia')

    const dropdown = await screen.findByRole('listbox')
    await waitFor(() => expect(dropdown.style.top).not.toBe(''))
    const initialTop = dropdown.style.top

    rectMock = { ...rectMock, top: 300, bottom: 330, y: 300 } as DOMRect
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    await waitFor(() => {
      expect(dropdown.style.top).not.toBe(initialTop)
    })
  })

  it('updates position when .filter-drawer__body scrolls', async () => {
    const user = userEvent.setup()
    renderASS(
      <div className="filter-drawer__body">
        <AsyncSearchSelect {...baseProps} onToggle={vi.fn()} />
      </div>
    )
    await user.type(screen.getByRole('combobox'), 'nia')

    const dropdown = await screen.findByRole('listbox')
    await waitFor(() => expect(dropdown.style.top).not.toBe(''))
    const initialTop = dropdown.style.top

    rectMock = { ...rectMock, top: 400, bottom: 430, y: 400 } as DOMRect
    const scrollable = document.querySelector('.filter-drawer__body')
    expect(scrollable).not.toBeNull()
    act(() => {
      scrollable?.dispatchEvent(new Event('scroll'))
    })

    await waitFor(() => {
      expect(dropdown.style.top).not.toBe(initialTop)
    })
  })
})
