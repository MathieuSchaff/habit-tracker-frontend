import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ActiveFiltersBar } from '../ActiveFiltersBar'

type Key = 'concern' | 'kind'

const groupLabels: Record<Key, string> = {
  concern: 'Problème',
  kind: 'Type',
}

const labelMap: Record<Key, Record<string, string>> = {
  concern: { acne: 'Acné', aging: 'Vieillissement' },
  kind: { serum: 'Sérum', cleanser: 'Nettoyant' },
}

const getFilterLabel = (key: Key, value: string) => labelMap[key]?.[value] ?? value // fallback to raw slug if not in map

describe('ActiveFiltersBar — empty', () => {
  it('renders nothing when there are no active tags and no extras', () => {
    const { container } = render(
      <ActiveFiltersBar
        activeTags={[]}
        groupLabels={groupLabels}
        getFilterLabel={getFilterLabel}
        onRemoveTag={vi.fn()}
        onClearAll={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })
})

describe('ActiveFiltersBar — pills', () => {
  it('renders one pill per active tag with prefix + label', () => {
    render(
      <ActiveFiltersBar
        activeTags={[{ key: 'concern', value: 'acne' }]}
        groupLabels={groupLabels}
        getFilterLabel={getFilterLabel}
        onRemoveTag={vi.fn()}
        onClearAll={vi.fn()}
      />
    )

    const pill = screen.getByRole('button', { name: /Retirer le filtre Acné/i })
    expect(pill).toBeInTheDocument()
    expect(pill).toHaveTextContent('Problème:')
    expect(pill).toHaveTextContent('Acné')
  })

  it('renders N pills for N active tags', () => {
    render(
      <ActiveFiltersBar
        activeTags={[
          { key: 'concern', value: 'acne' },
          { key: 'concern', value: 'aging' },
          { key: 'kind', value: 'serum' },
        ]}
        groupLabels={groupLabels}
        getFilterLabel={getFilterLabel}
        onRemoveTag={vi.fn()}
        onClearAll={vi.fn()}
      />
    )
    expect(screen.getAllByRole('button', { name: /Retirer le filtre/ })).toHaveLength(3)
  })

  it('falls back to the raw slug when getFilterLabel has no entry', () => {
    render(
      <ActiveFiltersBar
        activeTags={[{ key: 'concern', value: 'unknown-slug' }]}
        groupLabels={groupLabels}
        getFilterLabel={getFilterLabel}
        onRemoveTag={vi.fn()}
        onClearAll={vi.fn()}
      />
    )
    expect(
      screen.getByRole('button', { name: /Retirer le filtre unknown-slug/i })
    ).toBeInTheDocument()
  })

  it('exposes aria-live="polite" on the bar for screen-reader announcements', () => {
    const { container } = render(
      <ActiveFiltersBar
        activeTags={[{ key: 'concern', value: 'acne' }]}
        groupLabels={groupLabels}
        getFilterLabel={getFilterLabel}
        onRemoveTag={vi.fn()}
        onClearAll={vi.fn()}
      />
    )
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument()
  })
})

describe('ActiveFiltersBar — actions', () => {
  it('calls onRemoveTag(key, value) when a pill is clicked', async () => {
    const onRemoveTag = vi.fn()
    const user = userEvent.setup()
    render(
      <ActiveFiltersBar
        activeTags={[{ key: 'concern', value: 'acne' }]}
        groupLabels={groupLabels}
        getFilterLabel={getFilterLabel}
        onRemoveTag={onRemoveTag}
        onClearAll={vi.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: /Retirer le filtre Acné/i }))
    expect(onRemoveTag).toHaveBeenCalledTimes(1)
    expect(onRemoveTag).toHaveBeenCalledWith('concern', 'acne')
  })

  it('calls onClearAll exactly once when "Tout effacer" is clicked', async () => {
    const onClearAll = vi.fn()
    const user = userEvent.setup()
    render(
      <ActiveFiltersBar
        activeTags={[{ key: 'concern', value: 'acne' }]}
        groupLabels={groupLabels}
        getFilterLabel={getFilterLabel}
        onRemoveTag={vi.fn()}
        onClearAll={onClearAll}
      />
    )
    await user.click(screen.getByRole('button', { name: /Retirer tous les filtres/i }))
    expect(onClearAll).toHaveBeenCalledTimes(1)
  })
})

describe('ActiveFiltersBar — extras', () => {
  it('renders extra chips alongside active tags and wires onRemove', async () => {
    const extraRemove = vi.fn()
    const user = userEvent.setup()
    render(
      <ActiveFiltersBar
        activeTags={[]}
        groupLabels={groupLabels}
        getFilterLabel={getFilterLabel}
        onRemoveTag={vi.fn()}
        onClearAll={vi.fn()}
        extraChips={[{ id: 'price', prefix: 'Prix', label: '< 20€', onRemove: extraRemove }]}
      />
    )
    const pill = screen.getByRole('button', { name: /Retirer le filtre Prix < 20€/i })
    expect(pill).toHaveTextContent('Prix:')
    expect(pill).toHaveTextContent('< 20€')
    await user.click(pill)
    expect(extraRemove).toHaveBeenCalledTimes(1)
  })

  it('renders the bar when only extras are provided (no active tags)', () => {
    const { container } = render(
      <ActiveFiltersBar
        activeTags={[]}
        groupLabels={groupLabels}
        getFilterLabel={getFilterLabel}
        onRemoveTag={vi.fn()}
        onClearAll={vi.fn()}
        extraChips={[{ id: 'p', prefix: 'P', label: 'X', onRemove: vi.fn() }]}
      />
    )
    expect(container.firstChild).not.toBeNull()
    expect(screen.getByRole('button', { name: /Retirer le filtre P X/i })).toBeInTheDocument()
  })
})

describe('ActiveFiltersBar — keyboard activation', () => {
  it('activates a pill via Enter (native button semantics)', async () => {
    const onRemoveTag = vi.fn()
    const user = userEvent.setup()
    render(
      <ActiveFiltersBar
        activeTags={[{ key: 'concern', value: 'acne' }]}
        groupLabels={groupLabels}
        getFilterLabel={getFilterLabel}
        onRemoveTag={onRemoveTag}
        onClearAll={vi.fn()}
      />
    )
    const pill = screen.getByRole('button', { name: /Retirer le filtre Acné/i })
    pill.focus()
    await user.keyboard('{Enter}')
    expect(onRemoveTag).toHaveBeenCalledWith('concern', 'acne')
  })

  it('activates a pill via Space (native button semantics)', async () => {
    const onRemoveTag = vi.fn()
    const user = userEvent.setup()
    render(
      <ActiveFiltersBar
        activeTags={[{ key: 'concern', value: 'acne' }]}
        groupLabels={groupLabels}
        getFilterLabel={getFilterLabel}
        onRemoveTag={onRemoveTag}
        onClearAll={vi.fn()}
      />
    )
    const pill = screen.getByRole('button', { name: /Retirer le filtre Acné/i })
    pill.focus()
    await user.keyboard(' ')
    expect(onRemoveTag).toHaveBeenCalledWith('concern', 'acne')
  })
})

describe('ActiveFiltersBar — DOM order', () => {
  it('renders pills before extras, extras before "Tout effacer"', () => {
    render(
      <ActiveFiltersBar
        activeTags={[{ key: 'concern', value: 'acne' }]}
        groupLabels={groupLabels}
        getFilterLabel={getFilterLabel}
        onRemoveTag={vi.fn()}
        onClearAll={vi.fn()}
        extraChips={[{ id: 'price', prefix: 'Prix', label: '< 20€', onRemove: vi.fn() }]}
      />
    )
    const buttons = screen.getAllByRole('button')
    const labels = buttons.map((b) => b.getAttribute('aria-label') ?? '')
    const tagIdx = labels.findIndex((l) => l.includes('Retirer le filtre Acné'))
    const extraIdx = labels.findIndex((l) => l.includes('Retirer le filtre Prix'))
    const clearIdx = labels.findIndex((l) => l.includes('Retirer tous les filtres'))
    expect(tagIdx).toBeLessThan(extraIdx)
    expect(extraIdx).toBeLessThan(clearIdx)
  })
})
