import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { ComboboxPrimitive } from '@/component/search/ComboboxPrimitive'
import { productQueries } from '@/lib/queries/products'

interface BrandComboboxProps {
  id?: string
  value: string
  onChange: (value: string, confirmed: boolean) => void
  inputClassName?: string
  placeholder?: string
}

/**
 * Combobox spécifique pour les marques, utilisant la primitive commune
 * pour garantir la cohérence visuelle et l'accessibilité.
 */
export function BrandCombobox({
  id,
  value,
  onChange,
  inputClassName = '',
  placeholder = 'Ex : The Ordinary, Solgar…',
}: BrandComboboxProps) {
  const [inputValue, setInputValue] = useState(value)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const { data: brands = [], isLoading } = useQuery(productQueries.brands())

  const filtered = brands.filter((b) => b.toLowerCase().includes(inputValue.toLowerCase()))

  const isKnownBrand = (val: string) => brands.some((b) => b.toLowerCase() === val.toLowerCase())

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)
    setShowConfirm(false)
    setShowDropdown(val.length > 0)
    setHighlightedIndex(-1)
    onChange(val, false)
  }

  function handleSelect(brand: string) {
    setInputValue(brand)
    setShowDropdown(false)
    setShowConfirm(false)
    setHighlightedIndex(-1)
    onChange(brand, true)
  }

  // Gestion spécifique de la touche Tab pour l'autocomplétion
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && showDropdown && filtered.length > 0) {
      // Si on a un élément surligné ou une liste filtrée, on sélectionne
      const indexToSelect = highlightedIndex >= 0 ? highlightedIndex : 0
      handleSelect(filtered[indexToSelect])
      // On ne fait PAS e.preventDefault() pour laisser le focus aller au champ suivant
    }
  }

  function handleBlur() {
    // Petit délai pour laisser le temps au clic sur une option de passer
    setTimeout(() => {
      setShowDropdown(false)
      const trimmed = inputValue.trim()
      if (trimmed && !isKnownBrand(trimmed)) {
        setShowConfirm(true)
      }
    }, 200)
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
    <div className="brand-combobox-container">
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
      >
        <input
          id={id}
          type="text"
          className={inputClassName}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length > 0 && setShowDropdown(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          // Les rôles combobox/aria sont gérés par la primitive mais on peut en ajouter ici
        />
      </ComboboxPrimitive>

      {showConfirm && (
        <div
          className="brand-combobox__confirm"
          role="alert"
          style={{
            marginTop: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ flex: 1, color: 'var(--text-primary)' }}>
            Marque « {inputValue.trim()} » introuvable. Créer ?
          </span>
          <button
            type="button"
            style={{
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--color-primary)',
              color: 'white',
              cursor: 'pointer',
              fontSize: 'var(--text-xs)',
              fontWeight: '600',
            }}
            onClick={handleConfirmYes}
          >
            Oui
          </button>
          <button
            type="button"
            style={{
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 'var(--text-xs)',
            }}
            onClick={handleConfirmNo}
          >
            Non
          </button>
        </div>
      )}
    </div>
  )
}
