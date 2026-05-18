import {
  PRODUCT_TEXTURE_LABELS,
  PRODUCT_TEXTURE_VALUES,
  type ProductCategory,
} from '@habit-tracker/shared'

import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import { FormField } from '@/component/Input/FormField/FormField'

const TEXTURE_CATEGORIES: ReadonlySet<ProductCategory> = new Set([
  'skincare',
  'solaire',
  'bodycare',
])

export function TextureField({
  category,
  value,
  onChange,
}: {
  category: ProductCategory
  value: string
  onChange: (next: string) => void
}) {
  if (!TEXTURE_CATEGORIES.has(category)) return null
  return (
    <FormField label="Texture" hint="Optionnel — cliquer à nouveau pour désélectionner">
      <ChipGroup
        options={PRODUCT_TEXTURE_VALUES.map((v) => ({
          value: v,
          label: PRODUCT_TEXTURE_LABELS[v],
        }))}
        selected={value ? [value] : []}
        onChange={(values) => {
          // Toggle mode so re-clicking the active chip clears it (exclusive radios swallow re-click).
          onChange(values.at(-1) ?? '')
        }}
        mode="toggle"
        aria-label="Texture du produit"
      />
    </FormField>
  )
}
