import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { productQueries } from '../../../../lib/queries/products'
import './BrandCombobox.css'

interface BrandComboboxProps {
  id?: string
  value: string
  onChange: (value: string, confirmed: boolean) => void
  inputClassName?: string
  placeholder?: string
}

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
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const { data: brands = [] } = useQuery(productQueries.brands())

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = brands.filter((b) =>
    b.toLowerCase().includes(inputValue.toLowerCase())
  )

  const isKnownBrand = (val: string) =>
    brands.some((b) => b.toLowerCase() === val.toLowerCase())

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)
    setShowConfirm(false)
    setShowDropdown(true)
    onChange(val, false)
  }

  function handleSelect(brand: string) {
    setInputValue(brand)
    setShowDropdown(false)
    setShowConfirm(false)
    onChange(brand, true)
  }

  function handleBlur() {
    setTimeout(() => {
      setShowDropdown(false)
      const trimmed = inputValue.trim()
      if (trimmed && !isKnownBrand(trimmed)) {
        setShowConfirm(true)
      }
    }, 150)
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
    <div className="brand-combobox" ref={containerRef}>
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
      />

      {showDropdown && filtered.length > 0 && (
        <ul className="brand-combobox__dropdown">
          {filtered.map((brand) => (
            <li key={brand}>
              <button
                type="button"
                className="brand-combobox__option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(brand)}
              >
                {brand}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showConfirm && (
        <div className="brand-combobox__confirm">
          <span className="brand-combobox__confirm-text">
            Marque « {inputValue.trim()} » introuvable. Créer une nouvelle marque ?
          </span>
          <button
            type="button"
            className="brand-combobox__confirm-btn brand-combobox__confirm-btn--yes"
            onClick={handleConfirmYes}
          >
            Oui
          </button>
          <button
            type="button"
            className="brand-combobox__confirm-btn brand-combobox__confirm-btn--no"
            onClick={handleConfirmNo}
          >
            Non
          </button>
        </div>
      )}
    </div>
  )
}
