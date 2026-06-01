/* Exported so tests assert the same string the user sees. */
export const SUGGEST_LABELS = {
  action: 'Proposer une correction',
  title: 'Proposer une correction',
  fieldLabel: 'Champ à corriger',
  valueLabel: 'Valeur proposée',
  valueRequired: 'Proposez une valeur pour aider la relecture.',
  submit: 'Envoyer',
  cancel: 'Annuler',
  successMessage:
    "Merci. La modération va relire votre proposition. Rien n'est modifié tant qu'elle n'est pas validée.",
} as const

export const FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  brand: 'Marque',
  inci: 'Composition (INCI)',
  description: 'Description',
}
