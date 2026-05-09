// Product texture — orthogonal to `kind` (functional category like serum or
// cleanser). A `cleanser` can be `gel` / `mousse` / `huile` / `baume`; a
// `moisturizer` can be `creme` / `gel` / `lait`. Texture drives sensoriel
// tagging (S5 — texture-gel/mousse/stick) which the kind alone cannot supply.

export const PRODUCT_TEXTURES = {
  GEL: 'gel',
  CREME: 'creme',
  MOUSSE: 'mousse',
  STICK: 'stick',
  HUILE: 'huile',
  LAIT: 'lait',
  EAU: 'eau',
  BAUME: 'baume',
  PATCH: 'patch',
} as const

export type ProductTexture = (typeof PRODUCT_TEXTURES)[keyof typeof PRODUCT_TEXTURES]

export const PRODUCT_TEXTURE_VALUES = Object.values(PRODUCT_TEXTURES) as [
  ProductTexture,
  ...ProductTexture[],
]

export const PRODUCT_TEXTURE_LABELS: Record<ProductTexture, string> = {
  gel: 'Gel',
  creme: 'Crème',
  mousse: 'Mousse',
  stick: 'Stick',
  huile: 'Huile',
  lait: 'Lait',
  eau: 'Eau',
  baume: 'Baume',
  patch: 'Patch',
}

export function getProductTextureLabel(texture: string): string {
  return PRODUCT_TEXTURE_LABELS[texture as ProductTexture] ?? texture
}
