import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Toggle } from '../Toggle'

afterEach(() => cleanup())

describe('Toggle — rendering', () => {
  it('renders the label', () => {
    render(<Toggle label="Profil public" checked={false} onChange={vi.fn()} />)
    expect(screen.getByText('Profil public')).toBeInTheDocument()
  })

  it('renders the hint when provided', () => {
    render(
      <Toggle
        label="Profil public"
        hint="Visible par les autres."
        checked={false}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('Visible par les autres.')).toBeInTheDocument()
  })

  it('does not render a hint element when hint is omitted', () => {
    render(<Toggle label="Profil public" checked={false} onChange={vi.fn()} />)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('renders a hidden checkbox input', () => {
    render(<Toggle label="Profil public" checked={false} onChange={vi.fn()} />)
    const input = screen.getByRole('checkbox', { hidden: true })
    expect(input).toBeInTheDocument()
    expect(input).not.toBeChecked()
  })

  it('reflects checked state', () => {
    render(<Toggle label="Profil public" checked={true} onChange={vi.fn()} />)
    expect(screen.getByRole('checkbox', { hidden: true })).toBeChecked()
  })
})

describe('Toggle — interaction', () => {
  it('calls onChange with true when toggled on', () => {
    const handleChange = vi.fn()
    render(<Toggle label="Profil public" checked={false} onChange={handleChange} />)
    fireEvent.click(screen.getByRole('checkbox', { hidden: true }))
    expect(handleChange).toHaveBeenCalledOnce()
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('calls onChange with false when toggled off', () => {
    const handleChange = vi.fn()
    render(<Toggle label="Profil public" checked={true} onChange={handleChange} />)
    fireEvent.click(screen.getByRole('checkbox', { hidden: true }))
    expect(handleChange).toHaveBeenCalledWith(false)
  })

  it('does not call onChange when disabled', () => {
    const handleChange = vi.fn()
    render(<Toggle label="Profil public" checked={false} onChange={handleChange} disabled />)
    fireEvent.click(screen.getByRole('checkbox', { hidden: true }))
    expect(handleChange).not.toHaveBeenCalled()
  })
})

describe('Toggle — variants', () => {
  it('applies toggle--sm class when size is sm', () => {
    const { container } = render(
      <Toggle label="Test" checked={false} onChange={vi.fn()} size="sm" />,
    )
    expect(container.firstChild).toHaveClass('toggle--sm')
  })

  it('applies toggle--md class by default', () => {
    const { container } = render(<Toggle label="Test" checked={false} onChange={vi.fn()} />)
    expect(container.firstChild).toHaveClass('toggle--md')
  })

  it('applies toggle--column class when layout is column', () => {
    const { container } = render(
      <Toggle label="Test" checked={false} onChange={vi.fn()} layout="column" />,
    )
    expect(container.firstChild).toHaveClass('toggle--column')
  })

  it('applies toggle--row class by default', () => {
    const { container } = render(<Toggle label="Test" checked={false} onChange={vi.fn()} />)
    expect(container.firstChild).toHaveClass('toggle--row')
  })
})
