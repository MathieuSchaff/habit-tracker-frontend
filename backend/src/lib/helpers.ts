/**
 * Helpers partagés entre les services (products, ingredients, etc.)
 */

/**
 * Détecte une violation de contrainte UNIQUE PostgreSQL (code 23505).
 */
export function isUniqueViolation(e: unknown): boolean {
  if (!(e instanceof Error)) return false

  // Helper pour extraire le code ou errno
  const getErrorCode = (err: any) => {
    if (typeof err !== 'object' || err === null) return undefined
    return err.errno || err.code
  }

  // Si c'est une DrizzleQueryError, check la cause
  if ('cause' in e && e.cause instanceof Error) {
    return getErrorCode(e.cause) === '23505'
  }

  // Sinon check directement l'erreur
  return getErrorCode(e) === '23505'
}

/**
 * Comparaison profonde simple pour le diff des changes.
 * Gère les Date et les valeurs primitives.
 */
export function areEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  return a === b
}
