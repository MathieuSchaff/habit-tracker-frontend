/**
 * Helpers partagés entre les services (products, ingredients, etc.)
 */

/**
 * Détecte une violation de contrainte UNIQUE PostgreSQL (code 23505).
 */
// export function isUniqueViolation(e: unknown): boolean {
//   return e instanceof Error && 'code' in e && (e as { code: string }).code === '23505'
// }
export function isUniqueViolation(e: unknown): boolean {
  if (!(e instanceof Error)) return false

  // Si c'est une DrizzleQueryError, check la cause
  if ('cause' in e && e.cause instanceof Error && 'code' in e.cause) {
    return (e.cause as { code: string }).code === '23505'
  }

  // Sinon check directement l'erreur
  if ('code' in e) {
    return (e as { code: string }).code === '23505'
  }

  return false
}

/**
 * Comparaison profonde simple pour le diff des changes.
 * Gère les Date et les valeurs primitives.
 */
export function areEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  return a === b
}
