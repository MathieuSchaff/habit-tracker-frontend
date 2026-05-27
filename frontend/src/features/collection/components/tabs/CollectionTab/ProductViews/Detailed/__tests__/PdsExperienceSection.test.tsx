import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock must be hoisted before the component import (vitest hoisting).
const mutate = vi.fn()
vi.mock('@/lib/queries/user-products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/user-products')>()
  return {
    ...actual,
    useUpsertUserProductReview: vi.fn(() => ({ mutate })),
  }
})

import { PdsExperienceSection } from '../PdsExperienceSection'

function baseProduct(review?: Record<string, unknown>) {
  return {
    id: 'up-1',
    comment: '',
    sentiment: null,
    wouldRepurchase: null,
    ressenti: [],
    routine: [],
    preferences: [],
    status: 'in_stock',
    review: review ?? null,
  } as never
}

describe('PdsExperienceSection — public sharing gates', () => {
  afterEach(() => {
    cleanup()
    mutate.mockClear()
  })

  it('disables the share toggle until a public comment exists', () => {
    render(<PdsExperienceSection p={baseProduct()} updateMutation={{ mutate: vi.fn() }} />)
    // Toggle renders role="switch" (hidden input with label), named by the label text.
    const share = screen.getByRole('switch', { name: /partager publiquement/i })
    expect(share).toBeDisabled()
  })

  it('enables share once a public comment is persisted, and allows toggling ratings', () => {
    render(
      <PdsExperienceSection
        p={baseProduct({ comment: 'mon retour public', isPublic: true, ratingsPublic: false })}
        updateMutation={{ mutate: vi.fn() }}
      />
    )
    expect(screen.getByRole('switch', { name: /partager publiquement/i })).not.toBeDisabled()
    const ratings = screen.getByRole('switch', { name: /montrer mes notes/i })
    expect(ratings).not.toBeDisabled()
    fireEvent.click(ratings)
    expect(mutate).toHaveBeenCalledWith({ id: 'up-1', input: { ratingsPublic: true } })
  })

  it('disables the ratings toggle when the review is not public', () => {
    render(
      <PdsExperienceSection
        p={baseProduct({ comment: 'écrit', isPublic: false, ratingsPublic: false })}
        updateMutation={{ mutate: vi.fn() }}
      />
    )
    expect(screen.getByRole('switch', { name: /montrer mes notes/i })).toBeDisabled()
  })
})
