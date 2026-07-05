import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ReactionList } from '@/lib/queries/social'
import { reactionKeys } from '@/lib/queries/social'
import { useAuthStore } from '@/store/auth'
import { createTestQueryClient, renderWithProviders } from '@/test/utils'

vi.mock('@tanstack/react-router', () => ({
  // Button.tsx calls createLink at module load; stub so the import doesn't throw.
  createLink: vi.fn(() => vi.fn(({ children }) => children)),
  Link: ({
    to,
    params,
    children,
  }: {
    to: string
    params?: Record<string, string>
    children: React.ReactNode
  }) => {
    const href = params
      ? Object.entries(params).reduce((a, [k, v]) => a.replace(`$${k}`, v), to)
      : to
    return <a href={href}>{children}</a>
  },
}))

import { ReactionRow } from '../ReactionRow'

const TYPE = 'post' as const
const ID = 'post-1'

function emptyList(): ReactionList {
  return {
    reactableType: TYPE,
    reactableId: ID,
    reactions: { merci: [], 'moi-aussi': [], soutien: [] },
    viewerKinds: [],
  }
}

function seed(list: ReactionList, { authed }: { authed: boolean }) {
  const qc = createTestQueryClient()
  qc.setQueryData(reactionKeys.list(TYPE, ID), list)
  useAuthStore.setState({ accessToken: authed ? 'test-token' : null })
  return qc
}

describe('ReactionRow', () => {
  afterEach(() => {
    cleanup()
    useAuthStore.setState({ accessToken: null })
  })

  it('renders the three entraide buttons, the signed reactors, and never a count', () => {
    const list: ReactionList = {
      ...emptyList(),
      reactions: {
        merci: [{ username: 'lea', profilePublic: true }],
        'moi-aussi': [],
        soutien: [],
      },
      viewerKinds: ['merci'],
    }
    const { container } = renderWithProviders(
      <ReactionRow reactableType={TYPE} reactableId={ID} />,
      {
        queryClient: seed(list, { authed: true }),
      }
    )

    expect(screen.getByRole('button', { name: 'Merci' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Moi aussi' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(screen.getByRole('button', { name: 'Soutien' })).toBeInTheDocument()
    // The reactor is shown by name, never as a tally.
    expect(screen.getByText('lea')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\d/)
  })

  it('renders nothing for an anonymous reader when there are no reactions (calme)', () => {
    const { container } = renderWithProviders(
      <ReactionRow reactableType={TYPE} reactableId={ID} />,
      {
        queryClient: seed(emptyList(), { authed: false }),
      }
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows existing reactors to an anonymous reader but disables the toggle buttons', () => {
    const list: ReactionList = {
      ...emptyList(),
      reactions: {
        merci: [{ username: 'lea', profilePublic: false }],
        'moi-aussi': [],
        soutien: [],
      },
    }
    renderWithProviders(<ReactionRow reactableType={TYPE} reactableId={ID} />, {
      queryClient: seed(list, { authed: false }),
    })
    expect(screen.getByText('lea')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Merci' })).toBeDisabled()
  })
})
