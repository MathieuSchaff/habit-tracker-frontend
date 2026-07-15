import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('renders the page title as h1 and keeps a zero meta', () => {
    render(<PageHeader title="Articles" meta={0} />)

    const title = screen.getByRole('heading', { level: 1, name: 'Articles' })
    expect(title).toBeInTheDocument()
    expect(screen.getByText('0')).toHaveClass('page-header__meta')
  })

  it('masks a false meta instead of rendering an empty wrapper', () => {
    const { container } = render(<PageHeader title="Articles" meta={false} />)

    expect(container.querySelector('.page-header__meta')).toBeNull()
  })

  it('exposes the body rail through the private header custom property', () => {
    const { container } = render(<PageHeader title="Articles" maxWidth="72rem" />)

    expect(container.firstElementChild).toHaveStyle('--_header-max-width: 72rem')
  })
})
