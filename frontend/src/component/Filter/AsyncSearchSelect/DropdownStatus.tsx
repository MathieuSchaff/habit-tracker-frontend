type Props = {
  showDropdown: boolean
  isLoading: boolean
  filteredCount: number
  query: string
  debouncedQuery: string
  isOpen: boolean
  minChars: number
  announcement: string
}

function liveMessage(showDropdown: boolean, filteredCount: number, isLoading: boolean): string {
  if (!showDropdown) return ''
  if (filteredCount > 0) {
    const plural = filteredCount > 1 ? 's' : ''
    return `${filteredCount} résultat${plural} disponible${plural}`
  }
  if (isLoading) return 'Recherche en cours'
  return 'Aucun résultat'
}

export function DropdownStatus({
  showDropdown,
  isLoading,
  filteredCount,
  query,
  debouncedQuery,
  isOpen,
  minChars,
  announcement,
}: Props) {
  const showNoResult = showDropdown && !isLoading && filteredCount === 0
  const showMinChars = isOpen && debouncedQuery.length < minChars && query.length > 0
  const showLoading = isLoading && filteredCount === 0

  return (
    <>
      {showNoResult && <p className="search-select__empty">Aucun résultat</p>}
      {showMinChars && <p className="search-select__empty">Tapez au moins {minChars} caractères</p>}
      {showLoading && <p className="search-select__empty">Recherche…</p>}

      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage(showDropdown, filteredCount, isLoading)}
      </div>
    </>
  )
}
