import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ListBrowseHeader } from './ListBrowseHeader'
import { ListPageLayout } from './ListPageLayout'

describe('ListPageLayout.Header', () => {
  it('renders the page title as h1 and keeps a zero meta', () => {
    render(<ListPageLayout.Header title="Ma collection" meta={0} maxWidth="1200px" centered />)

    const title = screen.getByRole('heading', { level: 1, name: 'Ma collection' })
    const header = title.closest('.list-page-layout__header')
    expect(screen.getByText('0')).toHaveClass('list-page-layout__meta')
    expect(header).toHaveClass('list-page-layout__header--centered')
    expect(header).toHaveStyle('--_header-max-width: 1200px')
  })
})

describe('ListBrowseHeader', () => {
  it('renders the page title as h1 and keeps a zero result count', () => {
    render(<ListBrowseHeader title="Produits" meta={0} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Produits' })).toBeInTheDocument()
    expect(screen.getByText('0')).toHaveAttribute('aria-live', 'polite')
  })
})
