// Mirrors SQL search_norm() (unaccent + lower + collapse whitespace + trim) so
// client-side facet matching agrees with the backend text search.
export function foldText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()
}
