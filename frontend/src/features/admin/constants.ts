import type { RoleRequestStatus } from '@aurore/shared'

/* Admin UI wording, centralized so tests and production import the same string.
   Renaming a label here updates both — prevents silent test drift after a copy
   tweak (see 2026-05-21 audit, PR 4 pattern). */
export const adminLabels = {
  statOpenReports: 'Signalement(s) ouvert(s)',
  statActiveBans: 'Ban(s) actif(s)',
  statHiddenContent: 'Contenu(s) masqué(s)',
  statForcedPrivate: 'Profil(s) forcé(s) privé(s)',
  emptyReports: 'Aucun signalement.',
  emptyBans: 'Aucune mise en pause.',
  emptyUsersFiltered: 'Aucun email ne correspond.',
  emptyUsers: 'Aucun utilisateur.',
  userNotFound: 'Utilisateur introuvable.',
  pillForced: 'Forcé',
  emptySuggestedEdits: 'Aucune correction proposée.',
  navSuggestedEdits: 'Corrections',
  navCatalog: 'Catalogue',
  emptyCatalogQueue: 'Aucune fiche dans cette vue.',
  navRoleRequests: 'Demandes modérateur',
  statPendingRoleRequests: 'Demande(s) modérateur en attente',
  emptyRoleRequests: 'Aucune demande dans cette vue.',
  navErrors: 'Erreurs',
  emptyErrors: 'Aucune erreur dans cette vue.',
  navSecurity: 'Sécurité',
  emptySecurityEvents: 'Aucun événement dans cette vue.',
} as const

type UserRole = 'user' | 'admin' | 'contributor'

export const roleRequestStatusLabels: Record<RoleRequestStatus, string> = {
  pending: 'En attente',
  approved: 'Acceptée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
}

// 'contributor' surfaces as "Modérateur" in the UI; the code/DB role keeps its name.
export const roleLabels: Record<UserRole, string> = {
  user: 'Utilisateur',
  admin: 'Administrateur',
  contributor: 'Modérateur',
}

const adminErrorMessages: Record<string, string> = {
  not_a_contributor: "Ce compte n'est pas modérateur.",
  cannot_self_demote: 'Vous ne pouvez pas vous rétrograder vous-même.',
  cannot_self_ban: 'Vous ne pouvez pas vous mettre en pause.',
  already_banned: 'Ce compte est déjà en pause sur cette portée.',
  not_pending: "Cette demande n'est plus en attente.",
  not_found: 'Utilisateur introuvable.',
  forbidden: 'Action non autorisée.',
  invalid_input: 'Données invalides.',
  server_error: 'Erreur serveur. Réessayer.',
  rate_limit_exceeded: 'Trop de tentatives. Réessayer plus tard.',
}

export function getAdminErrorMessage(err: Error): string {
  return adminErrorMessages[err.message] ?? 'Une erreur est survenue.'
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
