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

type BenefitAxis =
  | 'soothing'
  | 'hydrating'
  | 'barrierSupport'
  | 'antioxidant'
  | 'brightening'
  | 'seborrheicRegulation'

// Noun-form labels for the collection "motifs" view: "<phrase> · N produits".
export const BENEFIT_AXIS_PHRASE: Record<BenefitAxis, string> = {
  soothing: 'apaisant',
  hydrating: 'hydratant',
  barrierSupport: 'soutient la barrière',
  antioxidant: 'antioxydant',
  brightening: 'coup d’éclat',
  seborrheicRegulation: 'régule le sébum',
}

// Dose signal: algo-derm emits continuous roleAtDose.doseFactor/confidence and
// leaves the boolean "is it active" cut to the consumer (ADR-0014). Prudent
// defaults pending gold-set calibration; prefer silence over a wrong claim.
export const DOSE_SIGNAL_MIN_DOSE_FACTOR = 0.7
export const DOSE_SIGNAL_MIN_CONFIDENCE = 0.6

// Qualitative only, never a % figure (vision: no number, no verdict).
export const DOSE_SIGNAL_PHRASE = 'probablement dosé pour agir'

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
