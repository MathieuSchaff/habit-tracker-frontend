import type { ReactionKind } from '@aurore/shared'

// FR display labels for the fixed entraide reaction set (ADR-0013). Wire values
// are already French; this decouples display from the stored kind, like the rest
// of the constants layer.
export const REACTION_KIND_LABELS: Record<ReactionKind, string> = {
  merci: 'Merci',
  'moi-aussi': 'Moi aussi',
  soutien: 'Soutien',
}
