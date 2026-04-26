import { ChevronDown, X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { useFlipPlacement } from '@/component/Search/useFlipPlacement'
import type { FilterOption } from '../types'

import './SearchSelect.css'

type SearchSelectProps = {
  options: FilterOption[]
  selected: string[]
  onToggle: (value: string) => void
  placeholder?: string
  label: string
  'aria-labelledby'?: string
}

export function SearchSelect({
  options,
  selected,
  onToggle,
  placeholder,
  label,
  'aria-labelledby': ariaLabelledBy,
}: SearchSelectProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => {
    if (!announcement) return
    const timer = setTimeout(() => setAnnouncement(''), 1000)
    return () => clearTimeout(timer)
  }, [announcement])
  const clickOutsideContainer = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  // lazy load long lists so the DOM stays small on first render
  const PAGE_SIZE = 50
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  useEffect(() => setVisibleCount(PAGE_SIZE), [])

  // only show unselected options that match the query
  const filtered = useMemo(() => {
    const unselected = options.filter((o) => !selected.includes(o.value))
    const result = query
      ? unselected.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
      : unselected
    return result.slice(0, visibleCount)
  }, [options, selected, query, visibleCount])

  const selectedOptions = options.filter((o) => selected.includes(o.value))

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      setVisibleCount((prev) => prev + PAGE_SIZE)
    }
  }

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
          if (activeIndex === 0) {
            inputRef.current?.focus()
          }
          break
        case 'Enter':
          e.preventDefault()
          if (isOpen && activeIndex >= 0 && filtered[activeIndex]) {
            setAnnouncement(`${filtered[activeIndex].label} ajouté`)
            onToggle(filtered[activeIndex].value)
            setQuery('')
            setActiveIndex(-1)
          } else {
            setIsOpen(true)
          }
          break
        case 'Escape':
          // only the first Escape closes the dropdown,
          // a second one will bubble up and close the whole dialog
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

  useFlipPlacement(clickOutsideContainer, dropdownRef, isOpen)

  // close the dropdown when clicking outside
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

  // keep the highlighted option visible while navigating with arrows
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
            aria-expanded={isOpen}
            aria-controls={isOpen ? listboxId : undefined}
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
                // onMouseDown + preventDefault so the input does not blur before click fires
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

        {isOpen && filtered.length > 0 && (
          <div
            ref={dropdownRef}
            id={listboxId}
            className="search-select__dropdown"
            role="listbox"
            aria-label={`Suggestions pour ${label}`}
            onScroll={handleScroll}
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

        {isOpen && query && filtered.length === 0 && (
          <p className="search-select__empty">Aucun résultat</p>
        )}

        <div className="sr-only" aria-live="assertive" aria-atomic="true">
          {announcement}
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isOpen && query.length > 0
            ? filtered.length > 0
              ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''} disponible${filtered.length > 1 ? 's' : ''}`
              : 'Aucun résultat'
            : ''}
        </div>
      </div>
    </div>
  )
}
