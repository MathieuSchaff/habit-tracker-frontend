import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createLink: vi.fn(() => vi.fn(({ children }) => children)),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mutate = vi.fn()
const useCreatePostMock = vi.fn()
vi.mock('@/lib/queries/social', () => ({
  useCreatePost: (...args: unknown[]) => useCreatePostMock(...args),
}))

const announce = vi.fn()
vi.mock('@/hooks/useAnnounce', () => ({
  useAnnounce: () => announce,
}))

import { PostComposer } from '../PostComposer'

describe('PostComposer', () => {
  beforeEach(() => {
    mutate.mockReset()
    announce.mockReset()
    useCreatePostMock.mockReset()
    useCreatePostMock.mockReturnValue({ mutate, isPending: false })
  })
  afterEach(() => cleanup())

  function open() {
    render(<PostComposer productId="prod-1" slug="creme-x" />)
    fireEvent.click(screen.getByRole('button', { name: /publication/i }))
  }

  it('is collapsed to a button until opened', () => {
    render(<PostComposer productId="prod-1" slug="creme-x" />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /publication/i }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('submits content with the chosen tone, then announces and resets', () => {
    mutate.mockImplementation((_input, opts) => opts?.onSuccess?.())
    open()

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Cette crème calme tout.' },
    })
    fireEvent.click(screen.getByRole('radio', { name: 'Coup de gueule' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publier' }))

    expect(mutate).toHaveBeenCalledWith(
      { content: 'Cette crème calme tout.', tone: 'coup-de-gueule' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(announce).toHaveBeenCalledWith('Publication publiée')
    // Form collapses back to the button after success.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('keeps submit disabled until there is content', () => {
    open()
    expect(screen.getByRole('button', { name: 'Publier' })).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Publier' })).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ok' } })
    expect(screen.getByRole('button', { name: 'Publier' })).toBeEnabled()
  })
})
