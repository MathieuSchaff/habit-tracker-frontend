export type DermoConflictSeverity = 'info' | 'warn'

export type DermoConflict = {
  a: string
  b: string
  severity: DermoConflictSeverity
  note: string
}

// Hardcoded MVP list. Promote to DB once it exceeds ~30 entries
// or needs editing without redeploy.
export const DERMO_CONFLICTS: readonly DermoConflict[] = [
  {
    a: 'retinol',
    b: 'glycolic-acid',
    severity: 'warn',
    note: 'Combinaison potentiellement irritante : éviter dans la même routine.',
  },
  {
    a: 'retinol',
    b: 'salicylic-acid',
    severity: 'warn',
    note: 'Combinaison potentiellement irritante : alterner soir / matin.',
  },
  {
    a: 'vitamin-c',
    b: 'niacinamide',
    severity: 'info',
    note: 'Co-application longtemps controversée ; tolérée en pratique mais à surveiller.',
  },
  {
    a: 'granactive-retinoid',
    b: 'glycolic-acid',
    severity: 'warn',
    note: 'Combinaison potentiellement irritante : éviter dans la même routine.',
  },
]
