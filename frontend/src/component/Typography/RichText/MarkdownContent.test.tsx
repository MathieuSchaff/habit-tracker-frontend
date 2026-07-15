import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import MarkdownContent from './MarkdownContent'

describe('MarkdownContent', () => {
  it('demotes authored h1 headings so the page title remains the only h1', () => {
    render(<MarkdownContent>{'# Section\n\n## Sous-section'}</MarkdownContent>)

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Section' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Sous-section' })).toBeInTheDocument()
  })
})
