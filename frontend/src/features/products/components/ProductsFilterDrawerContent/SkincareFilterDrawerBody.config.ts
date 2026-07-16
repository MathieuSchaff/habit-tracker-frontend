// Drawer-only label overrides. Canonical labels stay in
// features/products/filters.ts GROUP_LABELS.
export const DRAWER_GROUP_LABELS: Partial<Record<string, string>> = {
  texture: 'Texture ou forme',
  concern: 'Besoin de ma peau',
  skin_effect: 'Résultat recherché',
  skin_type: 'Type de peau',
  sensation: 'Fini sur la peau',
  product_characteristic: 'Composition, labels et propriétés',
  routine_step_v2: 'Étape de routine',
  actif_class: 'Actifs',
}

export const PRODUCT_GROUPS = ['product_type_v2', 'texture', 'ingredient'] as const
export const SKIN_GROUPS = ['concern', 'skin_effect', 'skin_type', 'skin_zone'] as const
export const PREFERENCE_AND_MORE_GROUPS = [
  'sensation',
  'product_characteristic',
  'routine_step_v2',
  'routine_moment',
  'actif_class',
  'search',
] as const
