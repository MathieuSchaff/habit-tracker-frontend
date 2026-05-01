import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ImageUpload } from '../ImageUpload'

describe('ImageUpload', () => {
  it('renders round shape for avatar', () => {
    const { container } = render(
      <ImageUpload
        shape="round"
        outputSize={1024}
        endpoint="/api/uploads/avatar"
        alt="Avatar"
        onSuccess={() => {}}
      />
    )
    expect(container.querySelector('.image-upload--round')).toBeTruthy()
  })

  it('renders square shape for product', () => {
    const { container } = render(
      <ImageUpload
        shape="square"
        outputSize={1200}
        endpoint="/api/uploads/product/foo"
        alt="Image produit"
        onSuccess={() => {}}
      />
    )
    expect(container.querySelector('.image-upload--square')).toBeTruthy()
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
