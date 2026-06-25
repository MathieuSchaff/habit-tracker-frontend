import type { UserPublic } from '@aurore/shared'

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/auth'
import { HomePage } from '../HomePage'

// The three branches are unit-tested at the seam: HomePage's only job is to pick
// the right surface by auth state (ADR 0011). Children are stubbed so the test
// asserts routing, not their internals.
vi.mock('../HomeHub', () => ({ HomeHub: () => <div>hub-surface</div> }))
vi.mock('../HomeMarketing', () => ({ HomeMarketing: () => <div>marketing-surface</div> }))
vi.mock('../HomeSkeleton', () => ({ HomeSkeleton: () => <div>boot-skeleton</div> }))

const fakeUser = { id: 'u1', username: 'lea' } as unknown as UserPublic

afterEach(() => {
  useAuthStore.setState({ user: null, bootRefreshPending: false })
})

describe('HomePage (dual-audience routing)', () => {
  it('shows the marketing surface for anonymous visitors', () => {
    useAuthStore.setState({ user: null, bootRefreshPending: false })
    render(<HomePage />)
    expect(screen.getByText('marketing-surface')).toBeInTheDocument()
    expect(screen.queryByText('hub-surface')).not.toBeInTheDocument()
  })

  it('shows the personal hub for signed-in users', () => {
    useAuthStore.setState({ user: fakeUser, bootRefreshPending: false })
    render(<HomePage />)
    expect(screen.getByText('hub-surface')).toBeInTheDocument()
    expect(screen.queryByText('marketing-surface')).not.toBeInTheDocument()
  })

  it('shows the neutral skeleton while the boot session probe is pending', () => {
    useAuthStore.setState({ user: null, bootRefreshPending: true })
    render(<HomePage />)
    expect(screen.getByText('boot-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('marketing-surface')).not.toBeInTheDocument()
  })
})
