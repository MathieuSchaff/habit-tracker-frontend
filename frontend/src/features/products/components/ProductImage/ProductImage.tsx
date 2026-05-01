import { useEffect, useState } from 'react'

import { ProductIcon } from '@/assets/product-icons'
import './ProductImage.css'

type Props = {
  kind: string
  unit: string | null
  imageUrl?: string | null
  size?: number
  className?: string
}

type Stage = 'real' | 'icon'

function initialStage(imageUrl?: string | null): Stage {
  return imageUrl?.trim() ? 'real' : 'icon'
}

export function ProductImage({ kind, unit, imageUrl, size = 48, className }: Props) {
  const [stage, setStage] = useState<Stage>(() => initialStage(imageUrl))

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

  return (
    <div
      className={`product-image ${className ?? ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={imageUrl?.trim()}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setStage('icon')}
        className="product-image__img"
      />
    </div>
  )
}
