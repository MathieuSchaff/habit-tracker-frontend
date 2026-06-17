type Props = {
  showDropdown: boolean
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  onRetry?: () => void
  filteredCount: number
  query: string
  debouncedQuery: string
  isOpen: boolean
  minChars: number
  announcement: string
}

function liveMessage(
  showDropdown: boolean,
  filteredCount: number,
  isLoading: boolean,
  isError: boolean
): string {
  if (!showDropdown) return ''
  // role="alert" on the visible error <p> already announces; stay silent here to avoid a double read.
  if (isError) return ''
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
  isError,
  errorMessage = 'Erreur de recherche',
  onRetry,
  filteredCount,
  query,
  debouncedQuery,
  isOpen,
  minChars,
  announcement,
}: Props) {
  const showError = showDropdown && isError
  const showNoResult = showDropdown && !isLoading && !isError && filteredCount === 0
  const showMinChars = isOpen && debouncedQuery.length < minChars && query.length > 0
  const showLoading = isLoading && filteredCount === 0 && !isError

  return (
    <>
      {showError && (
        <p className="search-select__empty search-select__empty--error" role="alert">
          <span>{errorMessage}</span>
          {onRetry && (
            <button type="button" className="search-select__retry" onClick={onRetry}>
              Réessayer
            </button>
          )}
        </p>
      )}
      {showNoResult && <p className="search-select__empty">Aucun résultat</p>}
      {showMinChars && <p className="search-select__empty">Tapez au moins {minChars} caractères</p>}
      {showLoading && <p className="search-select__empty">Recherche…</p>}

      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage(showDropdown, filteredCount, isLoading, isError)}
      </div>
    </>
  )
}
