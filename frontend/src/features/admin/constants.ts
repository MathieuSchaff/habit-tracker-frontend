/* Admin UI wording, centralized so tests and production import the same string.
   Renaming a label here updates both — prevents silent test drift after a copy
   tweak (see 2026-05-21 audit, PR 4 pattern). */
export const adminLabels = {
  statOpenReports: 'Signalement(s) ouvert(s)',
  statActiveBans: 'Ban(s) actif(s)',
  statHiddenContent: 'Contenu(s) masqué(s)',
  statForcedPrivate: 'Profil(s) forcé(s) privé(s)',
  emptyReports: 'Aucun signalement.',
  emptyBans: 'Aucun ban.',
  emptyUsersFiltered: 'Aucun email ne correspond.',
  emptyUsers: 'Aucun utilisateur.',
  userNotFound: 'Utilisateur introuvable.',
  pillForced: 'Forcé',
  emptySuggestedEdits: 'Aucune correction proposée.',
  navSuggestedEdits: 'Corrections',
} as const

type UserRole = 'user' | 'admin' | 'contributor'

// 'contributor' surfaces as "Modérateur" in the UI; the code/DB role keeps its name.
export const roleLabels: Record<UserRole, string> = {
  user: 'Utilisateur',
  admin: 'Administrateur',
  contributor: 'Modérateur',
}

// Pill colour per role; plain user keeps the neutral base, no modifier.
const rolePillModifier: Record<UserRole, string> = {
  user: '',
  admin: 'admin-pill--admin',
  contributor: 'admin-pill--contributor',
}

export function rolePillClass(role: UserRole): string {
  return `admin-pill ${rolePillModifier[role]}`.trim()
}
