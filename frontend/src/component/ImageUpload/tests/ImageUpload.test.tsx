import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ImageUpload } from '../ImageUpload'

describe('ImageUpload', () => {
  it('uses the avatar-flavored overlay copy when shape is round', () => {
    render(
      <ImageUpload
        shape="round"
        outputSize={1024}
        endpoint="/api/uploads/avatar"
        currentImageUrl="https://cdn/avatar.webp"
        alt="Avatar"
        onSuccess={() => {}}
      />
    )
    expect(screen.getByText('Changer la photo')).toBeInTheDocument()
  })

  it('uses the product-flavored overlay copy when shape is square', () => {
    render(
      <ImageUpload
        shape="square"
        outputSize={1200}
        endpoint="/api/uploads/product/foo"
        currentImageUrl="https://cdn/product.webp"
        alt="Image produit"
        onSuccess={() => {}}
      />
    )
    expect(screen.getByText('Changer')).toBeInTheDocument()
    expect(screen.queryByText('Changer la photo')).not.toBeInTheDocument()
  })

  it('renders current image when provided', () => {
    render(
      <ImageUpload
        shape="round"
        outputSize={1024}
        endpoint="/api/uploads/avatar"
        currentImageUrl="https://cdn/x.webp?v=1"
        alt="Avatar de Mathieu"
        onSuccess={() => {}}
      />
    )
    const img = screen.getByAltText('Avatar de Mathieu') as HTMLImageElement
    expect(img.src).toContain('https://cdn/x.webp')
  })
})
