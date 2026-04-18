import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GlobalError } from '../GlobalError'

// useNavigate returns a no-op function in tests
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

// reportError is a side-effect we don't need to test here
vi.mock('../../../../lib/errorReporter', () => ({
  reportError: vi.fn(),
}))

afterEach(() => cleanup())

const fakeError = new Error('Unexpected failure')

describe('GlobalError — runtime error variant', () => {
  it('renders the error title', () => {
    render(<GlobalError error={fakeError} />)
    expect(screen.getByText('On a renversé quelque chose.')).toBeInTheDocument()
  })

  it('renders the error subtitle', () => {
    render(<GlobalError error={fakeError} />)
    expect(screen.getByText(/tes données sont en sécurité/i)).toBeInTheDocument()
  })

  it('does NOT show raw error message', () => {
    render(<GlobalError error={fakeError} />)
    expect(screen.queryByText('Unexpected failure')).not.toBeInTheDocument()
  })

  it('shows Réessayer button only when reset is provided', () => {
    const { rerender } = render(<GlobalError error={fakeError} />)
    expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument()

    rerender(<GlobalError error={fakeError} reset={() => {}} />)
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
  })

  it("always shows Retour à l'accueil button", () => {
    render(<GlobalError error={fakeError} />)
    expect(screen.getByRole('button', { name: /retour à l'accueil/i })).toBeInTheDocument()
  })
})

describe('GlobalError — 404 variant', () => {
  it('renders the 404 title', () => {
    render(<GlobalError error={fakeError} is404 />)
    expect(screen.getByText("Cette page n'est pas dans notre routine.")).toBeInTheDocument()
  })

  it('renders the 404 subtitle', () => {
    render(<GlobalError error={fakeError} is404 />)
    expect(screen.getByText(/changé d'adresse/i)).toBeInTheDocument()
  })
})
