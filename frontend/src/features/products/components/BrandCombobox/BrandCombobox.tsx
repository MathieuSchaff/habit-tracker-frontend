import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Input } from '@/component/Input/Input'
import { ComboboxPrimitive } from '@/component/Search/ComboboxPrimitive'
import { productQueries } from '@/lib/queries/products'

import './BrandCombobox.css'

interface BrandComboboxProps {
  id?: string
  value: string
  onChange: (value: string, confirmed: boolean) => void
  /** Optional label rendered by the inner Input. Omit when an external <FormField> already provides one. */
  label?: string
  required?: boolean
  placeholder?: string
}

export function BrandCombobox({
  id,
  value,
  onChange,
  label,
  required,
  placeholder = 'Ex : The Ordinary, Solgar…',
}: BrandComboboxProps) {
  const [inputValue, setInputValue] = useState(value)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  // Tracks the latest value synchronously so handleBlur doesn't read a stale
  // closure when Tab autocompletes (handleSelect runs, then native blur fires
  // before React re-renders with the selected brand).
  const latestValueRef = useRef(value)

  useEffect(() => {
    setInputValue(value)
    latestValueRef.current = value
  }, [value])

  const { data: brands = [], isLoading } = useQuery(productQueries.brands())

  const filtered = useMemo(() => {
    const needle = inputValue.toLowerCase()
    return brands.filter((b) => b.toLowerCase().includes(needle))
  }, [brands, inputValue])

  const isKnownBrand = (val: string) => brands.some((b) => b.toLowerCase() === val.toLowerCase())

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    latestValueRef.current = val
    setInputValue(val)
    setShowConfirm(false)
    setShowDropdown(val.length > 0)
    setHighlightedIndex(-1)
    onChange(val, false)
  }

  function handleSelect(brand: string) {
    latestValueRef.current = brand
    setInputValue(brand)
    setShowDropdown(false)
    setShowConfirm(false)
    setHighlightedIndex(-1)
    onChange(brand, true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tab key autocompletes: select highlighted item or first match, then let focus move next
    if (e.key === 'Tab' && showDropdown && filtered.length > 0) {
      const indexToSelect = highlightedIndex >= 0 ? highlightedIndex : 0
      handleSelect(filtered[indexToSelect])
    }
  }

  function handleBlur() {
    // Option clicks don't fire blur — ComboboxPrimitive preventDefaults their
    // mousedown. Read from ref because Tab-autocomplete sets inputValue via
    // handleSelect, but blur fires before React re-renders.
    setShowDropdown(false)
    const trimmed = latestValueRef.current.trim()
    if (trimmed && !isKnownBrand(trimmed)) {
      setShowConfirm(true)
    }
  }

  function handleConfirmYes() {
    setShowConfirm(false)
    onChange(inputValue.trim(), true)
  }

  function handleConfirmNo() {
    setInputValue('')
    setShowConfirm(false)
    onChange('', false)
  }

  return (
    <div>
      <ComboboxPrimitive
        items={filtered}
        isOpen={showDropdown && filtered.length > 0}
        onClose={() => setShowDropdown(false)}
        onSelect={handleSelect}
        highlightedIndex={highlightedIndex}
        setHighlightedIndex={setHighlightedIndex}
        inputValue={inputValue}
        onKeyDown={handleKeyDown}
        isLoading={isLoading}
        renderItem={(brand) => brand}
        keyExtractor={(brand) => brand}
      >
        {({ listboxId, activeDescendant }) => (
          <Input
            id={id}
            type="text"
            role="combobox"
            label={label}
            required={required}
            // when no visible label, keep an accessible name
            aria-label={label ? undefined : 'Marque'}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => inputValue.length > 0 && setShowDropdown(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            autoComplete="off"
            aria-expanded={showDropdown && filtered.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
          />
        )}
      </ComboboxPrimitive>

      {showConfirm && (
        <div className="brand-combobox__confirm" role="alert">
          <span className="brand-combobox__confirm-text">
            Marque « {inputValue.trim()} » introuvable. Créer ?
          </span>
          <Button variant="primary" size="sm" onClick={handleConfirmYes}>
            Oui
          </Button>
          <Button variant="outline" size="sm" onClick={handleConfirmNo}>
            Non
          </Button>
        </div>
      )}
    </div>
  )
}
