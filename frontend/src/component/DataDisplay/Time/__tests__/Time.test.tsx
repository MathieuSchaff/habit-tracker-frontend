import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Time } from '../Time'

describe('<Time>', () => {
  it('renders a <time dateTime> with FR-formatted text by default', () => {
    render(<Time iso="2026-05-22T14:30:00.000Z" />)
    const el = screen.getByText('22 mai 2026')
    expect(el.tagName).toBe('TIME')
    expect(el).toHaveAttribute('dateTime', '2026-05-22T14:30:00.000Z')
  })

  it('honours the requested style', () => {
    render(<Time iso="2026-05-22T14:30:00.000Z" style="short" />)
    expect(screen.getByText('22/05/2026')).toBeInTheDocument()
  })

  it('renders a relative label with an absolute tooltip when `relative` is set', () => {
    const recent = new Date(Date.now() - 60_000).toISOString()
    render(<Time iso={recent} relative />)
    const el = screen.getByText(/il y a/)
    expect(el).toHaveAttribute('title')
    expect(el.getAttribute('title')).toMatch(/\d{1,2}/)
  })

  it('lets the caller override the tooltip on relative mode', () => {
    const recent = new Date(Date.now() - 60_000).toISOString()
    render(<Time iso={recent} relative title="custom" />)
    expect(screen.getByText(/il y a/)).toHaveAttribute('title', 'custom')
  })

  it('renders nothing when iso is null', () => {
    const { container } = render(<Time iso={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('forwards className', () => {
    render(<Time iso="2026-05-22T14:30:00.000Z" className="x" />)
    expect(screen.getByText('22 mai 2026')).toHaveClass('x')
  })
})
