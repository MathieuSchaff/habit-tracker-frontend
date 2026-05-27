import { useRef, useState } from 'react'

import { ProductIcon } from '@/assets/product-icons'
import './ProductImage.css'

type Props = {
  kind: string
  unit: string | null
  imageUrl?: string | null
  /** Fixed pixel size. Ignored when `fill` is true. */
  size?: number
  /** Stretch to fill container width (square aspect ratio). Overrides `size`. */
  fill?: boolean
  className?: string
}

export function ProductImage({ kind, unit, imageUrl, size = 48, fill, className }: Props) {
  const trimmedUrl = imageUrl?.trim() || null
  // Reset error during render to avoid an effect tick that flickers icon→image→icon.
  const [errorUrl, setErrorUrl] = useState<string | null>(null)
  // Tracks the previous URL only to detect a prop change; never rendered, so a ref suffices.
  const trackedUrl = useRef<string | null>(trimmedUrl)
  if (trackedUrl.current !== trimmedUrl) {
    trackedUrl.current = trimmedUrl
    setErrorUrl(null)
  }

  const showIcon = !trimmedUrl || errorUrl === trimmedUrl
  const sizeStyle = fill ? undefined : { width: size, height: size }
  const iconSize = fill ? 112 : Math.round(size * 0.55)
  const fillClass = fill ? 'product-image--fill' : ''

  if (showIcon) {
    return (
      <div
        className={`product-image product-image--icon ${fillClass} ${className ?? ''}`}
        style={sizeStyle}
        aria-hidden="true"
      >
        <ProductIcon unit={unit} kind={kind} size={iconSize} />
      </div>
    )
  }

  return (
    <div
      className={`product-image ${fillClass} ${className ?? ''}`}
      style={sizeStyle}
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
