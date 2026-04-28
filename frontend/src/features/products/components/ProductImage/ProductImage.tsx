import { useEffect, useState } from 'react'

import { ProductIcon } from '@/assets/product-icons'
import { getMockProductImage } from '@/features/products/getMockProductImage'
import './ProductImage.css'

type Props = {
  slug: string
  kind: string
  unit: string | null
  imageUrl?: string | null
  size?: number
  className?: string
}

// Fallback chain: real imageUrl → deterministic mock → kind icon.
// Each step is tried in order; failures advance to the next.
type Stage = 'real' | 'mock' | 'icon'

function initialStage(imageUrl?: string | null): Stage {
  return imageUrl?.trim() ? 'real' : 'mock'
}

export function ProductImage({ slug, kind, unit, imageUrl, size = 48, className }: Props) {
  const [stage, setStage] = useState<Stage>(() => initialStage(imageUrl))

  // Reset chain when slug or imageUrl changes (different product card recycled).
  useEffect(() => {
    setStage(initialStage(imageUrl))
  }, [imageUrl])

  if (stage === 'icon') {
    return (
      <div
        className={`product-image product-image--icon ${className ?? ''}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <ProductIcon unit={unit} kind={kind} size={Math.round(size * 0.55)} />
      </div>
    )
  }

  const src = stage === 'real' ? imageUrl?.trim() : getMockProductImage(slug)

  return (
    <div
      className={`product-image ${className ?? ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setStage(stage === 'real' ? 'mock' : 'icon')}
        className="product-image__img"
      />
    </div>
  )
}
