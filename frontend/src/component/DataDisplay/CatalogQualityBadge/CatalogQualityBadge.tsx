import { Check } from 'lucide-react'

import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { CATALOG_QUALITY_LABELS } from '@/constants/catalog'
import './CatalogQualityBadge.css'

type CatalogQuality = 'unverified' | 'verified'

// Positive-only signal: calm marker on verified sheets, nothing on unverified.
// A « non vérifié » warning would shame the submitter.
export function CatalogQualityBadge({ quality }: { quality: CatalogQuality }) {
  if (quality !== 'verified') return null
  return (
    <Badge variant="default" className="catalog-quality-badge">
      <Check size={12} aria-hidden="true" />
      {CATALOG_QUALITY_LABELS.verified}
    </Badge>
  )
}
