import { useQuery } from '@tanstack/react-query'
import { ChevronDown, X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import type { AsyncSearchQueryFactory } from '../types'

import '../SearchSelect/SearchSelect.css'

type AsyncSearchSelectProps = {
  selected: string[]
  onToggle: (value: string) => void
  // Loosely typed at the prop level — the type union of all possible factories
  // is impractical to thread; FilterAccordion validates presence at the call site.
  // biome-ignore lint/suspicious/noExplicitAny: see comment above
  loadOptionsQuery: AsyncSearchQueryFactory<string, any>
  // biome-ignore lint/suspicious/noExplicitAny: see comment above
  resolveValuesQuery: AsyncSearchQueryFactory<string[], any>
  placeholder?: string
  label: string
  minChars?: number
  debounce?: number
  'aria-labelledby'?: string
}

// Async sibling of SearchSelect: same UX, but options come from a remote
// search and selected chips are resolved server-side. Used when the option
// list is too large to ship to the client (e.g. ingredients catalog).
export function AsyncSearchSelect({
  selected,
  onToggle,
  loadOptionsQuery,
  resolveValuesQuery,
  placeholder,
  label,
  minChars = 2,
  debounce = 250,
  'aria-labelledby': ariaLabelledBy,
}: AsyncSearchSelectProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (!announcement) return
    const t = setTimeout(() => setAnnouncement(''), 1000)
    return () => clearTimeout(t)
  }, [announcement])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), debounce)
    return () => clearTimeout(t)
  }, [query, debounce])

  const clickOutsideContainer = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const optionsQuery = useQuery({
    ...loadOptionsQuery(debouncedQuery),
    enabled: debouncedQuery.length >= minChars,
  })

  const resolvedQuery = useQuery({
    ...resolveValuesQuery(selected),
    enabled: selected.length > 0,
  })

  // Merge labels seen via search OR resolution. Chips fall back to the raw
  // slug if the resolver hasn't returned yet (e.g. just after deep-link).
  const [labelCache, setLabelCache] = useState<Record<string, string>>({})
  useEffect(() => {
    const incoming = [...(resolvedQuery.data ?? []), ...(optionsQuery.data ?? [])]
    if (incoming.length === 0) return
    setLabelCache((prev) => {
      let changed = false
      const next = { ...prev }
      for (const opt of incoming) {
        if (next[opt.value] !== opt.label) {
          next[opt.value] = opt.label
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [resolvedQuery.data, optionsQuery.data])

  const filtered = useMemo(() => {
    const data = optionsQuery.data ?? []
    return data.filter((o) => !selected.includes(o.value))
  }, [optionsQuery.data, selected])

  const selectedOptions = useMemo(
    () => selected.map((value) => ({ value, label: labelCache[value] ?? value })),
    [selected, labelCache]
  )

  const showDropdown = isOpen && debouncedQuery.length >= minChars
  const isLoading = optionsQuery.isFetching && debouncedQuery.length >= minChars

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (!isOpen) {
            setIsOpen(true)
            setActiveIndex(0)
          } else {
            setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev))
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1))
          if (activeIndex === 0) inputRef.current?.focus()
          break
        case 'Enter':
          e.preventDefault()
          if (isOpen && activeIndex >= 0 && filtered[activeIndex]) {
            const opt = filtered[activeIndex]
            setAnnouncement(`${opt.label} ajouté`)
            onToggle(opt.value)
            setQuery('')
            setActiveIndex(-1)
          } else {
            setIsOpen(true)
          }
          break
        case 'Escape':
          if (isOpen) {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(false)
            setActiveIndex(-1)
            inputRef.current?.focus()
          }
          break
        case 'Tab':
          setIsOpen(false)
          setActiveIndex(-1)
          break
      }
    },
    [isOpen, activeIndex, filtered, onToggle]
  )

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }, [isOpen])

  // dropdown uses position:fixed to escape overflow:hidden ancestors —
  // flip above when there isn't enough room below. Depends on filtered.length
  // too: the listbox only mounts when results exist, which can happen one
  // render after showDropdown flips (async query). Without it, ref is null
  // on first run and inline coords stay empty.
  useEffect(() => {
    if (!showDropdown || !dropdownRef.current || !clickOutsideContainer.current) return

    const GAP = 4

    const updatePosition = () => {
      const wrapper = clickOutsideContainer.current
      const dropdown = dropdownRef.current
      if (!wrapper || !dropdown) return

      const rect = wrapper.getBoundingClientRect()
      const dropdownHeight = dropdown.offsetHeight
      const spaceBelow = window.innerHeight - rect.bottom - GAP
      const spaceAbove = rect.top - GAP
      const placeAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

      dropdown.style.left = `${rect.left}px`
      dropdown.style.width = `${rect.width}px`

      const MAX_HEIGHT = window.innerWidth >= 640 ? 240 : 200

      if (placeAbove) {
        dropdown.style.top = 'auto'
        dropdown.style.bottom = `${window.innerHeight - rect.top + GAP}px`
        dropdown.style.maxHeight = `${Math.min(spaceAbove, MAX_HEIGHT)}px`
      } else {
        dropdown.style.top = `${rect.bottom + GAP}px`
        dropdown.style.bottom = 'auto'
        dropdown.style.maxHeight = `${Math.min(spaceBelow, MAX_HEIGHT)}px`
      }
    }

    updatePosition()

    const scrollable = clickOutsideContainer.current.closest('.filter-drawer__body')
    scrollable?.addEventListener('scroll', updatePosition)
    window.addEventListener('resize', updatePosition)

    return () => {
      scrollable?.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [showDropdown, filtered.length])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        clickOutsideContainer.current &&
        !clickOutsideContainer.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setQuery('')
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (activeIndex >= 0 && isOpen) {
      const element = document.getElementById(`${listboxId}-option-${activeIndex}`)
      element?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, isOpen, listboxId])

  return (
    <div className="search-select">
      {selectedOptions.length > 0 && (
        <div className="search-select__selected">
          {selectedOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="chip chip--sm chip--active chip--removable"
              onClick={() => onToggle(opt.value)}
              aria-label={`Retirer ${opt.label}`}
            >
              {opt.label}
              <X size={12} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      <div ref={clickOutsideContainer}>
        <div className="search-select__input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="search-select__input"
            placeholder={placeholder ?? 'Rechercher...'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
              setActiveIndex(-1)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls={showDropdown ? listboxId : undefined}
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
            }
            aria-label={ariaLabelledBy ? undefined : label}
            aria-labelledby={ariaLabelledBy}
          />
          {isOpen && (
            <button
              type="button"
              className="search-select__dismiss"
              onMouseDown={(e) => {
                e.preventDefault()
                setIsOpen(false)
                setQuery('')
                setActiveIndex(-1)
                inputRef.current?.focus()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsOpen(false)
                  setQuery('')
                  setActiveIndex(-1)
                  inputRef.current?.focus()
                }
              }}
              aria-label="Fermer la liste"
            >
              <ChevronDown size={14} aria-hidden="true" style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
        </div>

        {showDropdown && filtered.length > 0 && (
          <div
            ref={dropdownRef}
            id={listboxId}
            className="search-select__dropdown"
            role="listbox"
            aria-label={`Suggestions pour ${label}`}
          >
            {filtered.map((opt, index) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard nav is on the combobox input via aria-activedescendant
              <div
                key={opt.value}
                role="option"
                id={`${listboxId}-option-${index}`}
                aria-selected={index === activeIndex}
                tabIndex={-1}
                className={`search-select__option-wrapper ${index === activeIndex ? 'search-select__option--active' : ''}`}
                onClick={() => {
                  setAnnouncement(`${opt.label} ajouté`)
                  onToggle(opt.value)
                  setQuery('')
                  setActiveIndex(-1)
                  inputRef.current?.focus()
                }}
              >
                <span className="search-select__option">{opt.label}</span>
              </div>
            ))}
          </div>
        )}

        {showDropdown && !isLoading && filtered.length === 0 && (
          <p className="search-select__empty">Aucun résultat</p>
        )}

        {isOpen && debouncedQuery.length < minChars && query.length > 0 && (
          <p className="search-select__empty">Tapez au moins {minChars} caractères</p>
        )}

        {isLoading && filtered.length === 0 && <p className="search-select__empty">Recherche…</p>}

        <div className="sr-only" aria-live="assertive" aria-atomic="true">
          {announcement}
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {showDropdown
            ? filtered.length > 0
              ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''} disponible${filtered.length > 1 ? 's' : ''}`
              : isLoading
                ? 'Recherche en cours'
                : 'Aucun résultat'
            : ''}
        </div>
      </div>
    </div>
  )
}
