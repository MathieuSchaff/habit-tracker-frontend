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

// roleAtDose is a qualitative signal, not a concentration estimate.
export const DOSE_SIGNAL_PHRASE = 'probablement dosé pour agir'

// Numeric estimates need a visible method and must fall back when the solver is weak.
export const CONC_METHOD_NOTE =
  'Estimé par l’algorithme d’après l’ordre de la liste INCI. Indicatif, non confirmé par la marque.'
export const CONC_UNESTIMABLE_PHRASE = 'présent · dose non estimable'

// Neutral caveats mapped from assessment confidence factors; limitationNotes
// carries the same facts but as dynamic English prose. unknown_ingredients is
// deliberately unmapped; the coverage footnote already states it.
export const CONFIDENCE_FACTOR_PHRASE: Record<string, string> = {
  low_coverage:
    'Formule encore peu couverte par nos données — pas assez de contexte pour en dire plus.',
  heuristic_only:
    'Certains signaux reposent sur le nom des ingrédients, pas sur des données consolidées.',
}

// Shown when the assessment ran but surfaced nothing: an analyzed-but-quiet
// formula must say so, silence is reserved for errors and missing INCI.
export const NO_SIGNAL_PHRASE = 'Rien de notable dans cette formule.'

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
