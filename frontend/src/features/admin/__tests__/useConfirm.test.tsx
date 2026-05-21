import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useConfirm } from '../useConfirm'

function Harness({ onResult }: { onResult: (v: boolean) => void }) {
  const { confirm, dialog } = useConfirm()
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const ok = await confirm({
            title: 'Vraiment ?',
            message: 'Action irréversible.',
            confirmLabel: 'Oui',
            cancelLabel: 'Non',
            variant: 'danger',
          })
          onResult(ok)
        }}
      >
        trigger
      </button>
      {dialog}
    </>
  )
}

describe('useConfirm', () => {
  it('renders the dialog with title + message + custom labels when confirm() is called', () => {
    render(<Harness onResult={() => {}} />)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('trigger'))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Vraiment ?')).toBeInTheDocument()
    expect(screen.getByText('Action irréversible.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Oui' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Non' })).toBeInTheDocument()
  })

  it('resolves the promise with true when the confirm button is clicked', async () => {
    const results: boolean[] = []
    render(<Harness onResult={(v) => results.push(v)} />)

    fireEvent.click(screen.getByText('trigger'))
    fireEvent.click(screen.getByRole('button', { name: 'Oui' }))

    // Promise resolution is async — yield a tick.
    await Promise.resolve()
    expect(results).toEqual([true])
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('resolves false when the cancel button is clicked', async () => {
    const results: boolean[] = []
    render(<Harness onResult={(v) => results.push(v)} />)

    fireEvent.click(screen.getByText('trigger'))
    fireEvent.click(screen.getByRole('button', { name: 'Non' }))

    await Promise.resolve()
    expect(results).toEqual([false])
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('falls back to default labels when caller omits them', () => {
    function Plain() {
      const { confirm, dialog } = useConfirm()
      return (
        <>
          <button type="button" onClick={() => void confirm({ title: 'Test' })}>
            open
          </button>
          {dialog}
        </>
      )
    }
    render(<Plain />)
    fireEvent.click(screen.getByText('open'))

    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeInTheDocument()
  })
})
