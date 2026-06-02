import { fireEvent, render, screen } from '@testing-library/react'
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

  it('shows a drop hint while a file is dragged over the trigger', () => {
    render(
      <ImageUpload
        shape="square"
        outputSize={1200}
        endpoint="/api/uploads/product/foo"
        alt="Image produit"
        onSuccess={() => {}}
      />
    )
    const trigger = screen.getByRole('button', { name: 'Image produit' })
    expect(screen.queryByText("Déposez l'image")).not.toBeInTheDocument()
    fireEvent.dragOver(trigger)
    expect(screen.getByText("Déposez l'image")).toBeInTheDocument()
    fireEvent.dragLeave(trigger)
    expect(screen.queryByText("Déposez l'image")).not.toBeInTheDocument()
  })

  it('swaps the hover label for the drop hint while dragging over an existing image', () => {
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
    const trigger = screen.getByRole('button', { name: 'Image produit' })
    expect(screen.getByText('Changer')).toBeInTheDocument()
    fireEvent.dragOver(trigger)
    expect(screen.queryByText('Changer')).not.toBeInTheDocument()
    expect(screen.getByText("Déposez l'image")).toBeInTheDocument()
    fireEvent.dragLeave(trigger)
    expect(screen.getByText('Changer')).toBeInTheDocument()
  })
})
