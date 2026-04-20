export interface ProductTagGroups {
  primary: string[]
  secondary: string[]
  avoid: string[]
}

export interface Ingredient {
  slug: string
  notes?: string
  concentrationValue?: number
  concentrationUnit?: string
  // legacy aliases kept for backward compatibility
  value?: number
  unit?: string
}

export interface UnifiedProductSeed {
  slug: string
  name: string
  brand: string
  category?: string
  kind: string
  unit: string
  totalAmount: number
  amountUnit: string
  priceCents: number
  description: string
  notes?: string
  inci?: string
  url?: string
  imageUrl?: string
  tags: ProductTagGroups
  keyIngredients?: Ingredient[]
}
