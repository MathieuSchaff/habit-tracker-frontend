type FilterTab<T extends string> = { value: T; label: string }

// Status filter bar shared by admin moderation pages: a tablist of mutually-exclusive
// buttons. `onChange` carries any per-page side effects (e.g. resetting feedback).
export function AdminFilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: ReadonlyArray<FilterTab<T>>
  value: T
  onChange: (value: T) => void
  label?: string
}) {
  return (
    <div className="admin-filter-bar" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          type="button"
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          className={`admin-filter-bar__btn ${value === t.value ? 'is-active' : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
