import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCreateReport } from '@/lib/queries/reports'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/lib/queries/reports', () => ({
  useCreateReport: vi.fn(),
}))

import { ReportContentButton } from '../ReportContentButton'
import { REPORT_LABELS } from '../ReportContentButton.constants'

type MutateFn = ReturnType<typeof useCreateReport>['mutate']

function setupMutation(overrides: { isPending?: boolean } = {}) {
  const mutate = vi.fn() as unknown as MutateFn
  vi.mocked(useCreateReport).mockReturnValue({
    mutate,
    isPending: overrides.isPending ?? false,
  } as unknown as ReturnType<typeof useCreateReport>)
  return mutate
}

describe('ReportContentButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when hidden=true (e.g., viewer is the author)', () => {
    setupMutation()
    const { container } = renderWithProviders(
      <ReportContentButton targetType="review" targetId="rev-1" hidden />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('opens the modal when the flag button is clicked', async () => {
    setupMutation()
    renderWithProviders(<ReportContentButton targetType="review" targetId="rev-1" />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Signaler ce contenu/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/Raison/i)).toBeInTheDocument()
  })

  it('shows a validation error and does not submit when the reason is empty', async () => {
    const mutate = setupMutation()
    renderWithProviders(<ReportContentButton targetType="review" targetId="rev-1" />)

    await userEvent.click(screen.getByRole('button', { name: /Signaler ce contenu/i }))
    await userEvent.click(screen.getByRole('button', { name: /Envoyer/i }))

    expect(screen.getByText(REPORT_LABELS.reasonRequired)).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('submits the trimmed reason via the mutation on form submit', async () => {
    const mutate = setupMutation()
    renderWithProviders(<ReportContentButton targetType="reply" targetId="rep-42" />)

    await userEvent.click(screen.getByRole('button', { name: /Signaler ce contenu/i }))

    const textarea = screen.getByLabelText(/Raison/i)
    // Whitespace must be trimmed before submission.
    fireEvent.change(textarea, { target: { value: '  Propos insultants  ' } })

    await userEvent.click(screen.getByRole('button', { name: /Envoyer/i }))

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate).toHaveBeenCalledWith(
      { targetType: 'reply', targetId: 'rep-42', reason: 'Propos insultants' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('shows the thank-you confirmation when the mutation succeeds', async () => {
    let capturedOnSuccess: (() => void) | undefined
    const mutate = vi.fn((_payload, opts) => {
      capturedOnSuccess = opts?.onSuccess
    })
    vi.mocked(useCreateReport).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateReport>)

    renderWithProviders(<ReportContentButton targetType="thread" targetId="t-1" />)

    await userEvent.click(screen.getByRole('button', { name: /Signaler ce contenu/i }))
    fireEvent.change(screen.getByLabelText(/Raison/i), { target: { value: 'Hors sujet' } })
    await userEvent.click(screen.getByRole('button', { name: /Envoyer/i }))

    await act(async () => {
      capturedOnSuccess?.()
    })

    await waitFor(() => {
      expect(screen.getByText(REPORT_LABELS.successMessage)).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/Raison/i)).not.toBeInTheDocument()
  })

  it('surfaces the error message when the mutation fails', async () => {
    let capturedOnError: ((err: Error) => void) | undefined
    const mutate = vi.fn((_payload, opts) => {
      capturedOnError = opts?.onError
    })
    vi.mocked(useCreateReport).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateReport>)

    renderWithProviders(<ReportContentButton targetType="thread" targetId="t-1" />)

    await userEvent.click(screen.getByRole('button', { name: /Signaler ce contenu/i }))
    fireEvent.change(screen.getByLabelText(/Raison/i), { target: { value: 'Hors sujet' } })
    await userEvent.click(screen.getByRole('button', { name: /Envoyer/i }))

    await act(async () => {
      capturedOnError?.(new Error('Rate limit exceeded'))
    })

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
    })
  })
})
