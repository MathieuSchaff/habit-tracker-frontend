import type { ReactionKind } from '@aurore/shared'

// Display labels stay separate from stored reaction kinds.
export const REACTION_KIND_LABELS: Record<ReactionKind, string> = {
  merci: 'Merci',
  'moi-aussi': 'Moi aussi',
  soutien: 'Soutien',
}
