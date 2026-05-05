import { useState } from 'react'

import { ProductIcon } from '@/assets/product-icons'
import './ProductImage.css'

type Props = {
  kind: string
  unit: string | null
  imageUrl?: string | null
  size?: number
  className?: string
}

export function ProductImage({ kind, unit, imageUrl, size = 48, className }: Props) {
  const trimmedUrl = imageUrl?.trim() || null
  // Reset error state on URL change via the "adjusting state during render"
  // pattern — avoids an extra effect tick that flickers icon→image→icon.
  const [errorUrl, setErrorUrl] = useState<string | null>(null)
  const [trackedUrl, setTrackedUrl] = useState<string | null>(trimmedUrl)
  if (trackedUrl !== trimmedUrl) {
    setTrackedUrl(trimmedUrl)
    setErrorUrl(null)
  }

  const showIcon = !trimmedUrl || errorUrl === trimmedUrl

  if (showIcon) {
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

  return (
    <div
      className={`product-image ${className ?? ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={trimmedUrl ?? undefined}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setErrorUrl(trimmedUrl)}
        className="product-image__img"
      />
    </div>
  )
}
