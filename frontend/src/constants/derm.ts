// FR phrasing for algo-derm risk axes and heuristic flag families.
// Calm, non-verdict wording per vision: describe a known signal, never rank or diagnose.

type RiskAxis =
  | 'irritation'
  | 'allergenicity'
  | 'comedogenicity'
  | 'dryness'
  | 'photosensitivity'
  | 'fungalAcne'

// Driver phrasing: "<ingredient> — <phrase>".
export const RISK_AXIS_PHRASE: Record<RiskAxis, string> = {
  irritation: 'peut être irritant',
  allergenicity: 'allergène potentiel',
  comedogenicity: 'peut favoriser les imperfections',
  dryness: 'peut dessécher',
  photosensitivity: 'peut sensibiliser au soleil',
  fungalAcne: 'peut nourrir la levure (fungal acne)',
}

// Skin-profile slugs → risk axes that matter to that user, used to highlight
// relevant signals without re-deriving the backend's profile mapping.
export const PROFILE_RELEVANT_AXES: Record<string, ReadonlyArray<RiskAxis>> = {
  'peau-sensible': ['irritation', 'allergenicity'],
  rosacee: ['irritation'],
  couperose: ['irritation'],
  flushs: ['irritation'],
  'anti-rougeurs': ['irritation'],
  'anti-acne': ['comedogenicity', 'fungalAcne'],
  'post-acne': ['comedogenicity', 'fungalAcne'],
  'pores-dilates': ['comedogenicity', 'fungalAcne'],
  brillance: ['comedogenicity', 'fungalAcne'],
}
