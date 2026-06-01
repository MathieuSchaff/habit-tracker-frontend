import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CatalogQualityBadge } from './CatalogQualityBadge'

describe('CatalogQualityBadge', () => {
  it('renders the « Vérifiée » marker on a verified sheet', () => {
    render(<CatalogQualityBadge quality="verified" />)
    expect(screen.getByText('Vérifiée')).toBeInTheDocument()
  })

  // Zero-guilt: an unverified sheet must show nothing — never a « non vérifié » warning.
  it('renders nothing on an unverified sheet', () => {
    const { container } = render(<CatalogQualityBadge quality="unverified" />)
    expect(container).toBeEmptyDOMElement()
  })
})
